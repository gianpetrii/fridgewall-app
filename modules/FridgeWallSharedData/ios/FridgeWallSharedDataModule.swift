import ExpoModulesCore
import UIKit
import WidgetKit

private let appGroupId = "group.com.fridgewall.app"
private let widgetDataKey = "fridgewall_widget_data"
private let allGroupsKey = "fridgewall_all_groups"
private let selectedWallKey = "fridgewall_selected_wall_id"
private let legacyPhotoFilename = "widget_photo.jpg"

public class FridgeWallSharedDataModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FridgeWallSharedData")

    AsyncFunction("saveWidgetData") { (jsonString: String) async throws -> [String: Any] in
      return try await self.saveWidgetDataInternal(groupId: nil, jsonString: jsonString)
    }

    AsyncFunction("saveWidgetDataForGroup") { (groupId: String, jsonString: String) async throws -> [String: Any] in
      return try await self.saveWidgetDataInternal(groupId: groupId, jsonString: jsonString)
    }

    AsyncFunction("saveAllGroups") { (jsonString: String) async throws -> Void in
      let defaults = UserDefaults(suiteName: appGroupId)
      defaults?.set(jsonString, forKey: allGroupsKey)
      defaults?.synchronize()
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadTimelines(ofKind: "FridgeWallWidget")
      }
    }

    AsyncFunction("advanceWidgetCarousel") { () async throws -> [String: Any] in
      guard
        let defaults = UserDefaults(suiteName: appGroupId),
        let jsonStr = defaults.string(forKey: widgetDataKey),
        let data = jsonStr.data(using: .utf8),
        var json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
        let photos = json["photos"] as? [[String: Any]],
        photos.count > 1
      else {
        return ["advanced": false]
      }

      let current = json["carouselIndex"] as? Int ?? 0
      json["carouselIndex"] = (current + 1) % photos.count
      try persistAndReload(json: json)
      return ["advanced": true, "carouselIndex": json["carouselIndex"]!]
    }

    Function("goToHomeScreen") {
      DispatchQueue.main.async {
        UIApplication.shared.perform(#selector(NSXPCConnection.suspend))
      }
    }
  }

  private func saveWidgetDataInternal(groupId: String?, jsonString: String) async throws -> [String: Any] {
    guard var json = try JSONSerialization.jsonObject(with: Data(jsonString.utf8)) as? [String: Any] else {
      throw NSError(domain: "FridgeWallSharedData", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid JSON"])
    }

    let dataKey = groupId.map { "fridgewall_widget_data_\($0)" } ?? widgetDataKey
    let photoPrefix = groupId.map { "g_\($0)_photo_" } ?? "widget_photo_"
    let memberPrefix = groupId.map { "g_\($0)_member_" } ?? "widget_member_"

    var result: [String: Any] = ["photosSaved": 0, "membersSaved": 0, "error": NSNull()]

    guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId) else {
      result["error"] = "App Group container unavailable"
      try persistAndReload(json: json, key: dataKey)
      return result
    }

    var keptFilenames = Set<String>()

    if let photos = json["photos"] as? [[String: Any]], !photos.isEmpty {
      var updatedPhotos: [[String: Any]] = []
      for (index, var photo) in photos.enumerated() {
        // Nombre de archivo ESTABLE por contenido (hash de la URL), no por índice.
        // Así, cuando el array se reordena al publicar (prepend mete la nueva en 0),
        // cada foto sigue usando su mismo archivo: no hay duplicados ni fotos negras.
        let urlKey = (photo["photoUrl"] as? String)
          ?? (photo["localUri"] as? String)
          ?? "idx_\(index)"
        let filename = "\(photoPrefix)\(djb2Hash(urlKey)).jpg"
        if await savePhotoItem(photo: &photo, filename: filename, container: container) {
          photo["photoLocalName"] = filename
          photo.removeValue(forKey: "localUri")
          keptFilenames.insert(filename)
          result["photosSaved"] = (result["photosSaved"] as? Int ?? 0) + 1
        }
        updatedPhotos.append(photo)
      }
      json["photos"] = updatedPhotos
      mirrorLegacyFields(from: updatedPhotos, into: &json)
    } else if json["localUri"] != nil || json["photoUrl"] != nil {
      var legacy = json
      let legacyName = groupId.map { "g_\($0)_photo_legacy.jpg" } ?? legacyPhotoFilename
      if await savePhotoItem(photo: &legacy, filename: legacyName, container: container) {
        legacy["photoLocalName"] = legacyName
        legacy.removeValue(forKey: "localUri")
        keptFilenames.insert(legacyName)
        json = legacy
      }
    }

    if let slots = json["memberSlots"] as? [[String: Any]], !slots.isEmpty {
      var updatedSlots: [[String: Any]] = []
      for (index, var slot) in slots.enumerated() {
        guard slot["photoUrl"] != nil || slot["localUri"] != nil else {
          updatedSlots.append(slot)
          continue
        }
        let filename = "\(memberPrefix)\(index).jpg"
        if await savePhotoItem(photo: &slot, filename: filename, container: container) {
          slot["photoLocalName"] = filename
          slot.removeValue(forKey: "localUri")
          keptFilenames.insert(filename)
          result["membersSaved"] = (result["membersSaved"] as? Int ?? 0) + 1
        }
        updatedSlots.append(slot)
      }
      json["memberSlots"] = updatedSlots
    }

    let hasRemotePhotos = jsonHasRemotePhotos(json)
    if !keptFilenames.isEmpty || !hasRemotePhotos {
      if let gid = groupId {
        cleanupGroupFiles(in: container, prefix: "g_\(gid)_", keeping: keptFilenames)
      } else {
        cleanupOrphanedFiles(in: container, keeping: keptFilenames)
      }
    }
    try persistAndReload(json: json, key: dataKey)

    // Si es un guardado por grupo, actualiza la lista de grupos como fallback
    // y establece el wall seleccionado inicial si no hay ninguno guardado
    if let gid = groupId, let name = json["groupName"] as? String {
      updateGroupsList(groupId: gid, groupName: name)
      // Primera vez: inicializa selectedWallKey al wall que llega (el activo en la app)
      let defaults = UserDefaults(suiteName: appGroupId)
      if defaults?.string(forKey: selectedWallKey) == nil {
        defaults?.set(gid, forKey: selectedWallKey)
        defaults?.synchronize()
      }
    }

    result["hasRemotePhotos"] = hasRemotePhotos
    result["keptFiles"] = keptFilenames.count
    return result
  }

  private func savePhotoItem(
    photo: inout [String: Any],
    filename: String,
    container: URL
  ) async -> Bool {
    let destURL = container.appendingPathComponent(filename)

    // Foto local nueva (recién tomada/editada o de galería): copiar.
    if let localUri = photo["localUri"] as? String {
      let sourceURL: URL? = localUri.hasPrefix("file://")
        ? URL(string: localUri)
        : URL(fileURLWithPath: localUri)
      if let sourceURL, FileManager.default.fileExists(atPath: sourceURL.path) {
        do {
          if FileManager.default.fileExists(atPath: destURL.path) {
            try FileManager.default.removeItem(at: destURL)
          }
          try FileManager.default.copyItem(at: sourceURL, to: destURL)
          return true
        } catch {
          // Si falla la copia local, intentamos el fallback por URL más abajo.
        }
      }
    }

    if let photoUrlString = photo["photoUrl"] as? String, let photoUrl = URL(string: photoUrlString) {
      // Nombre estable por URL: si el archivo ya existe, es exactamente la misma
      // imagen (las fotos son inmutables) → reusar sin re-descargar.
      if FileManager.default.fileExists(atPath: destURL.path) {
        return true
      }
      do {
        let (data, _) = try await URLSession.shared.data(from: photoUrl)
        try data.write(to: destURL, options: .atomic)
        return true
      } catch {
        return false
      }
    }

    return false
  }

  /// Hash determinista (djb2) para nombrar archivos por contenido de forma estable
  /// entre lanzamientos. (String.hashValue de Swift es aleatorio por proceso, no sirve.)
  private func djb2Hash(_ s: String) -> String {
    var hash: UInt64 = 5381
    for byte in s.utf8 {
      hash = (hash &* 33) &+ UInt64(byte)
    }
    return String(hash, radix: 36)
  }

  private func mirrorLegacyFields(from photos: [[String: Any]], into json: inout [String: Any]) {
    guard let first = photos.first else { return }
    if let url = first["photoUrl"] { json["photoUrl"] = url }
    if let name = first["photoLocalName"] { json["photoLocalName"] = name }
    if let poster = first["posterName"] { json["posterName"] = poster }
    if let created = first["createdAt"] { json["createdAt"] = created }
  }

  private func jsonHasRemotePhotos(_ json: [String: Any]) -> Bool {
    if json["photoUrl"] != nil { return true }
    guard let photos = json["photos"] as? [[String: Any]] else { return false }
    return photos.contains { $0["photoUrl"] != nil }
  }

  private func cleanupOrphanedFiles(in container: URL, keeping: Set<String>) {
    guard let files = try? FileManager.default.contentsOfDirectory(atPath: container.path) else { return }
    for file in files {
      let isWidgetAsset =
        file == legacyPhotoFilename
        || file.hasPrefix("widget_photo_")
        || file.hasPrefix("widget_member_")
      if isWidgetAsset && !keeping.contains(file) {
        try? FileManager.default.removeItem(at: container.appendingPathComponent(file))
      }
    }
  }

  private func updateGroupsList(groupId: String, groupName: String) {
    guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
    var groups: [[String: String]] = []
    if let existing = defaults.string(forKey: allGroupsKey),
       let data = existing.data(using: .utf8),
       let decoded = try? JSONDecoder().decode([[String: String]].self, from: data) {
      groups = decoded
    }
    // Agrega si no existe, actualiza el nombre si ya existe
    if let idx = groups.firstIndex(where: { $0["id"] == groupId }) {
      groups[idx]["name"] = groupName
    } else {
      groups.append(["id": groupId, "name": groupName])
    }
    if let encoded = try? JSONEncoder().encode(groups),
       let str = String(data: encoded, encoding: .utf8) {
      defaults.set(str, forKey: allGroupsKey)
      defaults.synchronize()
    }
  }

  private func cleanupGroupFiles(in container: URL, prefix: String, keeping: Set<String>) {
    guard let files = try? FileManager.default.contentsOfDirectory(atPath: container.path) else { return }
    for file in files where file.hasPrefix(prefix) {
      if !keeping.contains(file) {
        try? FileManager.default.removeItem(at: container.appendingPathComponent(file))
      }
    }
  }

  private func persistAndReload(json: [String: Any], key: String = widgetDataKey) throws {
    let updatedData = try JSONSerialization.data(withJSONObject: json)
    let updatedJson = String(data: updatedData, encoding: .utf8) ?? "{}"
    let defaults = UserDefaults(suiteName: appGroupId)
    defaults?.set(updatedJson, forKey: key)
    defaults?.synchronize()

    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadTimelines(ofKind: "FridgeWallWidget")
    }
  }
}
