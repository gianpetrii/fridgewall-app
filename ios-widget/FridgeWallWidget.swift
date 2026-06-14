import WidgetKit
import SwiftUI
import UIKit
import AppIntents

// MARK: - Data model

struct WidgetPhotoItem: Codable {
    var photoUrl: String?
    var photoLocalName: String?
    var posterName: String?
    var createdAt: Double?
}

struct WidgetMemberSlot: Codable {
    var userId: String?
    var userName: String?
    var photoUrl: String?
    var photoLocalName: String?
}

struct WidgetData: Codable {
    var photos: [WidgetPhotoItem]?
    var carouselIndex: Int?
    var memberSlots: [WidgetMemberSlot]?
    var groupName: String?
    // legacy
    var photoUrl: String?
    var photoLocalName: String?
    var posterName: String?
    var createdAt: Double?
}

private let appGroupId = "group.com.fridgewall.app"
private let carouselIntervalSec = 8
private let widgetDataKey = "fridgewall_widget_data"
private let allGroupsKey = "fridgewall_all_groups"
private let selectedWallKey = "fridgewall_selected_wall_id"

// MARK: - Wall list helper

private struct WallInfo {
    var id: String
    var name: String
}

private func loadWallsList() -> [WallInfo] {
    guard
        let defaults = UserDefaults(suiteName: appGroupId),
        let json = defaults.string(forKey: allGroupsKey),
        let data = json.data(using: .utf8),
        let groups = try? JSONDecoder().decode([[String: String]].self, from: data)
    else { return [] }
    return groups.compactMap { dict in
        guard let id = dict["id"], let name = dict["name"] else { return nil }
        return WallInfo(id: id, name: name)
    }
}

// MARK: - Select next wall intent (funciona en iOS 16+, botón interactivo en iOS 17+)

struct SelectNextWallIntent: AppIntent {
    static var title: LocalizedStringResource = "Cambiar wall"
    static var description = IntentDescription("Cambia al próximo wall disponible")

    func perform() async throws -> some IntentResult {
        guard let defaults = UserDefaults(suiteName: appGroupId) else {
            return .result()
        }
        let walls = loadWallsList()
        guard walls.count > 1 else { return .result() }

        let currentId = defaults.string(forKey: selectedWallKey) ?? walls[0].id
        let currentIndex = walls.firstIndex(where: { $0.id == currentId }) ?? 0
        let nextIndex = (currentIndex + 1) % walls.count

        defaults.set(walls[nextIndex].id, forKey: selectedWallKey)
        defaults.synchronize()
        return .result()
    }
}

// MARK: - Image helpers

private func loadLocalImage(name: String?) -> UIImage? {
    guard
        let name,
        let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId)
    else { return nil }
    return UIImage(contentsOfFile: container.appendingPathComponent(name).path)
}

private func resolvedPhotos(from data: WidgetData) -> [WidgetPhotoItem] {
    if let photos = data.photos, !photos.isEmpty { return photos }
    if data.photoUrl != nil || data.photoLocalName != nil {
        return [WidgetPhotoItem(
            photoUrl: data.photoUrl,
            photoLocalName: data.photoLocalName,
            posterName: data.posterName,
            createdAt: data.createdAt
        )]
    }
    return []
}

private func activePhoto(from data: WidgetData) -> WidgetPhotoItem? {
    let photos = resolvedPhotos(from: data)
    guard !photos.isEmpty else { return nil }
    let idx = (data.carouselIndex ?? 0) % photos.count
    return photos[idx]
}

private func hasPhoto(data: WidgetData) -> Bool {
    guard let photo = activePhoto(from: data) else { return false }
    return photo.photoLocalName != nil || photo.photoUrl != nil
}

// MARK: - Timeline

struct FridgeWallEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
    /// Cantidad de walls disponibles (para mostrar/ocultar el botón de cambio)
    let wallCount: Int
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> FridgeWallEntry {
        FridgeWallEntry(date: Date(), data: WidgetData(groupName: "Mi familia"), wallCount: 1)
    }

    func getSnapshot(in context: Context, completion: @escaping (FridgeWallEntry) -> Void) {
        completion(FridgeWallEntry(date: Date(), data: loadData(), wallCount: loadWallsList().count))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FridgeWallEntry>) -> Void) {
        let base = loadData()
        let wallCount = loadWallsList().count
        let photos = resolvedPhotos(from: base)
        let now = Date()

        if photos.count > 1 && context.family != .systemLarge {
            var entries: [FridgeWallEntry] = []
            for (index, _) in photos.enumerated() {
                var entryData = base
                entryData.carouselIndex = index
                let date = Calendar.current.date(byAdding: .second, value: index * carouselIntervalSec, to: now)!
                entries.append(FridgeWallEntry(date: date, data: entryData, wallCount: wallCount))
            }
            let reload = Calendar.current.date(byAdding: .second, value: photos.count * carouselIntervalSec, to: now)!
            completion(Timeline(entries: entries, policy: .after(reload)))
        } else {
            let next = Calendar.current.date(byAdding: .minute, value: 15, to: now)!
            completion(Timeline(entries: [FridgeWallEntry(date: now, data: base, wallCount: wallCount)], policy: .after(next)))
        }
    }

    private func loadData() -> WidgetData {
        let defaults = UserDefaults(suiteName: appGroupId)
        // Usa el wall seleccionado por el usuario (via botón del widget)
        if let gid = defaults?.string(forKey: selectedWallKey) {
            let groupKey = "fridgewall_widget_data_\(gid)"
            if let json = defaults?.string(forKey: groupKey),
               let bytes = json.data(using: .utf8),
               let data = try? JSONDecoder().decode(WidgetData.self, from: bytes) {
                return data
            }
        }
        // Fallback al dato global (último wall sincronizado)
        guard
            let json = defaults?.string(forKey: widgetDataKey),
            let bytes = json.data(using: .utf8),
            let data = try? JSONDecoder().decode(WidgetData.self, from: bytes)
        else { return WidgetData() }
        return data
    }
}

// MARK: - Live data reader (lee de UserDefaults en tiempo real, no del timeline entry)

private func loadLiveData() -> WidgetData {
    let defaults = UserDefaults(suiteName: appGroupId)
    // Intenta leer del grupo seleccionado
    if let gid = defaults?.string(forKey: selectedWallKey) {
        let groupKey = "fridgewall_widget_data_\(gid)"
        if let json = defaults?.string(forKey: groupKey),
           let bytes = json.data(using: .utf8),
           let data = try? JSONDecoder().decode(WidgetData.self, from: bytes) {
            return data
        }
    }
    // Fallback al dato global
    if let json = defaults?.string(forKey: widgetDataKey),
       let bytes = json.data(using: .utf8),
       let data = try? JSONDecoder().decode(WidgetData.self, from: bytes) {
        return data
    }
    return WidgetData()
}

// MARK: - Image resizing for widget memory limits

private func resizeImage(_ image: UIImage, maxSize: CGFloat = 800) -> UIImage {
    let size = image.size
    let ratio = min(maxSize / size.width, maxSize / size.height)
    if ratio >= 1 { return image }
    let newSize = CGSize(width: size.width * ratio, height: size.height * ratio)
    UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
    image.draw(in: CGRect(origin: .zero, size: newSize))
    let resized = UIGraphicsGetImageFromCurrentImageContext()
    UIGraphicsEndImageContext()
    return resized ?? image
}

// MARK: - Photo background

struct WidgetPhotoBackground: View {
    private var photo: WidgetPhotoItem? {
        activePhoto(from: loadLiveData())
    }

    var body: some View {
        if let uiImage = loadLocalImage(name: photo?.photoLocalName) {
            Image(uiImage: resizeImage(uiImage))
                .resizable()
                .scaledToFill()
        } else if let urlString = photo?.photoUrl, let url = URL(string: urlString) {
            AsyncImage(url: url) { phase in
                if let image = phase.image {
                    image.resizable().scaledToFill()
                } else {
                    Color.black
                }
            }
        } else {
            Color(.systemBackground)
        }
    }
}

// MARK: - Large mosaic

struct MemberCell: View {
    let slot: WidgetMemberSlot

    var body: some View {
        ZStack {
            if let uiImage = loadLocalImage(name: slot.photoLocalName) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
            } else if let urlString = slot.photoUrl, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                    } else {
                        placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .clipped()
    }

    private var placeholder: some View {
        ZStack {
            Color.gray.opacity(0.35)
            Text(initial)
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(.white)
        }
    }

    private var initial: String {
        let name = slot.userName ?? slot.userId ?? "?"
        return String(name.prefix(1)).uppercased()
    }
}

struct MosaicWidgetView: View {
    let slots: [WidgetMemberSlot]

    var body: some View {
        GeometryReader { geo in
            let count = max(slots.count, 1)
            Group {
                switch count {
                case 1:
                    MemberCell(slot: slots[0])
                case 2:
                    HStack(spacing: 2) {
                        MemberCell(slot: slots[0])
                        MemberCell(slot: slots[1])
                    }
                case 3:
                    VStack(spacing: 2) {
                        HStack(spacing: 2) {
                            MemberCell(slot: slots[0])
                            MemberCell(slot: slots[1])
                        }
                        .frame(height: geo.size.height * 0.5)
                        MemberCell(slot: slots[2])
                            .frame(height: geo.size.height * 0.5)
                    }
                default:
                    let shown = Array(slots.prefix(4))
                    let extra = slots.count - 4
                    VStack(spacing: 2) {
                        HStack(spacing: 2) {
                            MemberCell(slot: shown[0])
                            MemberCell(slot: shown[1])
                        }
                        .frame(height: geo.size.height * 0.5)
                        HStack(spacing: 2) {
                            MemberCell(slot: shown[2])
                            ZStack(alignment: .bottomTrailing) {
                                MemberCell(slot: shown[3])
                                if extra > 0 {
                                    Text("+\(extra)")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.white)
                                        .padding(6)
                                        .background(Color.black.opacity(0.55))
                                        .cornerRadius(8)
                                        .padding(6)
                                }
                            }
                        }
                        .frame(height: geo.size.height * 0.5)
                    }
                }
            }
        }
    }
}

// MARK: - Widget view

struct FridgeWallWidgetView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var cameraURL: URL { URL(string: "fridgewall://camera")! }
    var galleryURL: URL { URL(string: "fridgewall://gallery")! }
    var nextPhotoURL: URL { URL(string: "fridgewall://widget-next")! }
    var uploadURL: URL { URL(string: "fridgewall://upload")! }
    var selectWallURL: URL { URL(string: "fridgewall://select-wall")! }

    // Usa datos live de UserDefaults en lugar del entry del timeline (que puede estar stale)
    private var liveData: WidgetData { loadLiveData() }
    private var active: WidgetPhotoItem? { activePhoto(from: liveData) }
    private var showPhoto: Bool { hasPhoto(data: liveData) }
    private var multiWall: Bool { loadWallsList().count > 1 }

    var body: some View {
        if family == .systemLarge {
            largeBody
        } else {
            carouselBody
        }
    }

    @ViewBuilder
    private var largeBody: some View {
        ZStack(alignment: .bottom) {
            let hasSlots = !(liveData.memberSlots?.isEmpty ?? true)
            if !hasSlots && !showPhoto {
                emptyState
            }

            if liveData.groupName != nil {
                LinearGradient(colors: [.clear, .black.opacity(0.6)], startPoint: .center, endPoint: .bottom)
                Text(liveData.groupName ?? "FridgeWall")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(8)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .overlay(alignment: .topTrailing) {
            actionButtons
                .unredacted()
        }
        .widgetURL(galleryURL)
    }

    @ViewBuilder
    private var carouselBody: some View {
        ZStack(alignment: .bottom) {
            if !showPhoto {
                emptyState
            }

            if showPhoto {
                LinearGradient(
                    colors: [.clear, .black.opacity(0.75)],
                    startPoint: .center,
                    endPoint: .bottom
                )

                VStack(spacing: 0) {
                    Spacer()

                    HStack(alignment: .bottom) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(liveData.groupName ?? "FridgeWall")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.white)
                            if let name = active?.posterName {
                                Text("de \(name)")
                                    .font(.system(size: 11))
                                    .foregroundColor(.white.opacity(0.7))
                            }
                        }
                        Spacer()
                        if let ts = active?.createdAt {
                            Text(timeAgo(Date(timeIntervalSince1970: ts / 1000)))
                                .font(.system(size: 11))
                                .foregroundColor(.white.opacity(0.55))
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.bottom, 10)
                }
            }
        }
        .overlay(alignment: .topTrailing) {
            if family == .systemSmall {
                smallActions
                    .padding(8)
            } else {
                actionButtons
            }
        }
        .widgetURL(widgetTapURL)
    }

    private var widgetTapURL: URL? {
        if family == .systemSmall { return uploadURL }
        let photos = resolvedPhotos(from: liveData)
        if photos.count > 1 { return nextPhotoURL }
        return galleryURL
    }

    /// Botón de cámara solo para widget pequeño (sin texto, tap = abrir cámara/galería)
    @ViewBuilder
    private var smallActions: some View {
        iconButton(icon: "camera.fill")
    }

    /// Botones cámara + galería + (si multiwall) botón de cambiar wall
    @ViewBuilder
    private var actionButtons: some View {
        HStack(spacing: 6) {
            if multiWall {
                // iOS 17+: botón interactivo nativo (no abre la app)
                if #available(iOS 17.0, *) {
                    Button(intent: SelectNextWallIntent()) {
                        iconButton(icon: "arrow.2.circlepath")
                    }
                    .buttonStyle(.plain)
                } else {
                    // iOS 16: abre la app para seleccionar wall
                    Link(destination: selectWallURL) {
                        iconButton(icon: "arrow.2.circlepath")
                    }
                }
            }
            Link(destination: cameraURL) {
                iconButton(icon: "camera.fill")
            }
            Link(destination: galleryURL) {
                iconButton(icon: "photo.fill")
            }
        }
        .padding(10)
    }

    private var emptyState: some View {
        VStack(spacing: 6) {
            Text("🧲").font(.system(size: 36))
            Text("FridgeWall")
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Color.primary)
            Text("Tocá para agregar una foto")
                .font(.system(size: 11))
                .foregroundStyle(Color.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func iconButton(icon: String) -> some View {
        Image(systemName: icon)
            .font(.system(size: 13, weight: .medium))
            .frame(width: 32, height: 32)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .foregroundStyle(Color.primary)
    }

    private func timeAgo(_ date: Date) -> String {
        let diff = Date().timeIntervalSince(date)
        let m = Int(diff / 60)
        let h = Int(diff / 3600)
        let d = Int(diff / 86400)
        if m < 1 { return "ahora" }
        if m < 60 { return "\(m)m" }
        if h < 24 { return "\(h)h" }
        return "\(d)d"
    }
}

// MARK: - Container background

struct WidgetContainerBackground: View {
    @Environment(\.widgetFamily) var family
    
    // Lee datos live de UserDefaults
    private var liveData: WidgetData { loadLiveData() }

    var body: some View {
        if family == .systemLarge {
            if let slots = liveData.memberSlots, !slots.isEmpty {
                MosaicWidgetView(slots: slots)
            } else {
                WidgetPhotoBackground()
            }
        } else {
            WidgetPhotoBackground()
        }
    }
}

// MARK: - Widget declaration

struct FridgeWallWidget: Widget {
    let kind: String = "FridgeWallWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                FridgeWallWidgetView(entry: entry)
                    .containerBackground(for: .widget) {
                        WidgetContainerBackground()
                    }
            } else {
                ZStack {
                    WidgetContainerBackground()
                    FridgeWallWidgetView(entry: entry)
                }
            }
        }
        .configurationDisplayName("FridgeWall")
        .description("Fotos de tu wall en la pantalla de inicio")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

@main
struct FridgeWallWidgetBundle: WidgetBundle {
    var body: some Widget {
        FridgeWallWidget()
    }
}
