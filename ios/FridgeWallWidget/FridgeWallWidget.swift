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

// MARK: - Wall selection configuration (AppIntentConfiguration)

struct WallEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Wall"
    static var defaultQuery = WallQuery()

    var id: String
    var name: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

struct WallQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [WallEntity] {
        loadWalls().filter { identifiers.contains($0.id) }
    }
    
    func suggestedEntities() async throws -> [WallEntity] {
        loadWalls()
    }
    
    func defaultResult() async -> WallEntity? {
        loadWalls().first
    }
    
    private func loadWalls() -> [WallEntity] {
        guard
            let defaults = UserDefaults(suiteName: appGroupId),
            let json = defaults.string(forKey: allGroupsKey),
            let data = json.data(using: .utf8),
            let groups = try? JSONDecoder().decode([[String: String]].self, from: data),
            !groups.isEmpty
        else { return [] }
        return groups.compactMap { dict in
            guard let id = dict["id"], let name = dict["name"] else { return nil }
            return WallEntity(id: id, name: name)
        }
    }
}

struct WallSelectionIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Seleccionar Wall"
    static var description = IntentDescription("Elegí qué wall mostrar en este widget")

    @Parameter(title: "Wall")
    var wall: WallEntity?
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

// MARK: - Data loading

private func loadData(for wallId: String?) -> WidgetData {
    let defaults = UserDefaults(suiteName: appGroupId)
    // Si hay wall configurado, cargar datos de ese wall
    if let gid = wallId {
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

// MARK: - Timeline

struct FridgeWallEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
    let wallId: String?
}

struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> FridgeWallEntry {
        FridgeWallEntry(date: Date(), data: WidgetData(groupName: "Mi familia"), wallId: nil)
    }

    func snapshot(for configuration: WallSelectionIntent, in context: Context) async -> FridgeWallEntry {
        let wallId = configuration.wall?.id
        return FridgeWallEntry(date: Date(), data: loadData(for: wallId), wallId: wallId)
    }

    func timeline(for configuration: WallSelectionIntent, in context: Context) async -> Timeline<FridgeWallEntry> {
        let wallId = configuration.wall?.id
        let base = loadData(for: wallId)
        let photos = resolvedPhotos(from: base)
        let now = Date()

        if photos.count > 1 && context.family != .systemLarge {
            var entries: [FridgeWallEntry] = []
            for (index, _) in photos.enumerated() {
                var entryData = base
                entryData.carouselIndex = index
                let date = Calendar.current.date(byAdding: .second, value: index * carouselIntervalSec, to: now)!
                entries.append(FridgeWallEntry(date: date, data: entryData, wallId: wallId))
            }
            let reload = Calendar.current.date(byAdding: .second, value: photos.count * carouselIntervalSec, to: now)!
            return Timeline(entries: entries, policy: .after(reload))
        } else {
            let next = Calendar.current.date(byAdding: .minute, value: 15, to: now)!
            return Timeline(entries: [FridgeWallEntry(date: now, data: base, wallId: wallId)], policy: .after(next))
        }
    }
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
    let wallId: String?
    
    private var photo: WidgetPhotoItem? {
        activePhoto(from: loadData(for: wallId))
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

    private var liveData: WidgetData { loadData(for: entry.wallId) }
    private var active: WidgetPhotoItem? { activePhoto(from: liveData) }
    private var showPhoto: Bool { hasPhoto(data: liveData) }

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
                    .padding(.horizontal, 10)
                    .padding(.bottom, 10)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .overlay(alignment: .topTrailing) {
            actionButtons
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
                    .padding(.horizontal, 10)
                    .padding(.bottom, 10)
                }
            }
        }
        .overlay(alignment: .topTrailing) {
            if family == .systemSmall {
                smallActions
                    .padding(10)
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

    @ViewBuilder
    private var smallActions: some View {
        Link(destination: cameraURL) {
            iconButton(icon: "camera.fill")
        }
    }

    @ViewBuilder
    private var actionButtons: some View {
        HStack(spacing: 6) {
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
    let wallId: String?
    @Environment(\.widgetFamily) var family
    
    private var liveData: WidgetData { loadData(for: wallId) }

    var body: some View {
        if family == .systemLarge {
            if let slots = liveData.memberSlots, !slots.isEmpty {
                MosaicWidgetView(slots: slots)
            } else {
                WidgetPhotoBackground(wallId: wallId)
            }
        } else {
            WidgetPhotoBackground(wallId: wallId)
        }
    }
}

// MARK: - Widget declaration

struct FridgeWallWidget: Widget {
    let kind: String = "FridgeWallWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: WallSelectionIntent.self, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                FridgeWallWidgetView(entry: entry)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .containerBackground(for: .widget) {
                        WidgetContainerBackground(wallId: entry.wallId)
                            .ignoresSafeArea()
                    }
            } else {
                ZStack {
                    WidgetContainerBackground(wallId: entry.wallId)
                    FridgeWallWidgetView(entry: entry)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .configurationDisplayName("FridgeWall")
        .description("Fotos de tu wall en la pantalla de inicio")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

@main
struct FridgeWallWidgetBundle: WidgetBundle {
    var body: some Widget {
        FridgeWallWidget()
    }
}
