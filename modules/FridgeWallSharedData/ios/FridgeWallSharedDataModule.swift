import ExpoModulesCore
import UIKit
import WidgetKit

private let appGroupId = "group.com.fridgewall.app"
private let widgetDataKey = "fridgewall_widget_data"
private let legacyPhotoFilename = "widget_photo.jpg"

public class FridgeWallSharedDataModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FridgeWallSharedData")

    AsyncFunction("saveWidgetData") { (jsonString: String) async throws -> [String: Any] in
      guard var json = try JSONSerialization.jsonObject(with: Data(jsonString.utf8)) as? [String: Any] else {
        throw NSError(domain: "FridgeWallSharedData", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid JSON"])
      }

      var result: [String: Any] = ["photosSaved": 0, "membersSaved": 0, "error": NSNull()]

      guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId) else {
        result["error"] = "App Group container unavailable"
        try persistAndReload(json: json)
        return result
      }

      var keptFilenames = Set<String>()

      if let photos = json["photos"] as? [[String: Any]], !photos.isEmpty {
        var updatedPhotos: [[String: Any]] = []
        for (index, var photo) in photos.enumerated() {
          let filename = "widget_photo_\(index).jpg"
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
        if await savePhotoItem(photo: &legacy, filename: legacyPhotoFilename, container: container) {
          legacy["photoLocalName"] = legacyPhotoFilename
          legacy.removeValue(forKey: "localUri")
          keptFilenames.insert(legacyPhotoFilename)
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
          let filename = "widget_member_\(index).jpg"
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
        cleanupOrphanedFiles(in: container, keeping: keptFilenames)
      }
      try persistAndReload(json: json)
      result["hasRemotePhotos"] = hasRemotePhotos
      result["keptFiles"] = keptFilenames.count
      return result
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

  private func savePhotoItem(photo: inout [String: Any], filename: String, container: URL) async -> Bool {
    let destURL = container.appendingPathComponent(filename)

    if let localUri = photo["localUri"] as? String {
      let sourceURL: URL?
      if localUri.hasPrefix("file://") {
        sourceURL = URL(string: localUri)
      } else {
        sourceURL = URL(fileURLWithPath: localUri)
      }
      if let sourceURL, FileManager.default.fileExists(atPath: sourceURL.path) {
        do {
          if FileManager.default.fileExists(atPath: destURL.path) {
            try FileManager.default.removeItem(at: destURL)
          }
          try FileManager.default.copyItem(at: sourceURL, to: destURL)
          return true
        } catch {
          return false
        }
      }
    }

    if let photoUrlString = photo["photoUrl"] as? String, let photoUrl = URL(string: photoUrlString) {
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

  private func persistAndReload(json: [String: Any]) throws {
    let updatedData = try JSONSerialization.data(withJSONObject: json)
    let updatedJson = String(data: updatedData, encoding: .utf8) ?? "{}"
    let defaults = UserDefaults(suiteName: appGroupId)
    defaults?.set(updatedJson, forKey: widgetDataKey)
    defaults?.synchronize()

    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadTimelines(ofKind: "FridgeWallWidget")
    }
  }
}
