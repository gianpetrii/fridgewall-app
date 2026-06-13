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

// MARK: - Wall selection intent

struct WallEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Wall"
    static var defaultQuery = WallQuery()

    var id: String
    var name: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

struct WallQuery: EnumerableEntityQuery {
    func entities(for identifiers: [String]) async throws -> [WallEntity] {
        loadWalls().filter { identifiers.contains($0.id) }
    }
    func allEntities() async throws -> [WallEntity] {
        return loadWalls()
    }
    private func loadWalls() -> [WallEntity] {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return [] }

        // Fuente primaria: lista guardada explícitamente
        if let json = defaults.string(forKey: allGroupsKey),
           let data = json.data(using: .utf8),
           let groups = try? JSONDecoder().decode([[String: String]].self, from: data),
           !groups.isEmpty {
            return groups.compactMap { dict in
                guard let id = dict["id"], let name = dict["name"] else { return nil }
                return WallEntity(id: id, name: name)
            }
        }

        // Fallback: extraer el grupo activo del dato del widget
        if let json = defaults.string(forKey: widgetDataKey),
           let data = json.data(using: .utf8),
           let widgetData = try? JSONDecoder().decode(WidgetData.self, from: data),
           let name = widgetData.groupName {
            return [WallEntity(id: "default", name: name)]
        }

        return []
    }
}

struct WallSelectionIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Seleccionar Wall"
    static var description = IntentDescription("Elegí qué wall mostrar en el widget")

    @Parameter(title: "Wall")
    var wall: WallEntity?

    init() {}
}

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
}

struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> FridgeWallEntry {
        FridgeWallEntry(date: Date(), data: WidgetData(groupName: "Mi familia"))
    }

    func snapshot(for configuration: WallSelectionIntent, in context: Context) async -> FridgeWallEntry {
        FridgeWallEntry(date: Date(), data: loadData(for: configuration.wall?.id))
    }

    func timeline(for configuration: WallSelectionIntent, in context: Context) async -> Timeline<FridgeWallEntry> {
        let base = loadData(for: configuration.wall?.id)
        let photos = resolvedPhotos(from: base)
        let now = Date()

        if photos.count > 1 && context.family != .systemLarge {
            var entries: [FridgeWallEntry] = []
            for (index, _) in photos.enumerated() {
                var entryData = base
                entryData.carouselIndex = index
                let date = Calendar.current.date(byAdding: .second, value: index * carouselIntervalSec, to: now)!
                entries.append(FridgeWallEntry(date: date, data: entryData))
            }
            let reload = Calendar.current.date(byAdding: .second, value: photos.count * carouselIntervalSec, to: now)!
            return Timeline(entries: entries, policy: .after(reload))
        } else {
            let next = Calendar.current.date(byAdding: .minute, value: 15, to: now)!
            return Timeline(entries: [FridgeWallEntry(date: now, data: base)], policy: .after(next))
        }
    }

    private func loadData(for groupId: String?) -> WidgetData {
        let defaults = UserDefaults(suiteName: appGroupId)
        // Intenta cargar datos del grupo seleccionado (ignora el id placeholder legacy)
        if let gid = groupId, gid != "__no_data__" {
            let groupKey = "fridgewall_widget_data_\(gid)"
            if let json = defaults?.string(forKey: groupKey),
               let bytes = json.data(using: .utf8),
               let data = try? JSONDecoder().decode(WidgetData.self, from: bytes) {
                return data
            }
        }
        // Fallback al dato activo global
        guard
            let json = defaults?.string(forKey: widgetDataKey),
            let bytes = json.data(using: .utf8),
            let data = try? JSONDecoder().decode(WidgetData.self, from: bytes)
        else { return WidgetData() }
        return data
    }
}

// MARK: - Photo background

struct WidgetPhotoBackground: View {
    let photo: WidgetPhotoItem?

    var body: some View {
        if let uiImage = loadLocalImage(name: photo?.photoLocalName) {
            Image(uiImage: uiImage)
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

// MARK: - Overlay (carousel sizes)

struct FridgeWallWidgetView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var cameraURL: URL { URL(string: "fridgewall://camera")! }
    var galleryURL: URL { URL(string: "fridgewall://gallery")! }
    var nextPhotoURL: URL { URL(string: "fridgewall://widget-next")! }
    var uploadURL: URL { URL(string: "fridgewall://upload")! }

    private var active: WidgetPhotoItem? { activePhoto(from: entry.data) }
    private var showPhoto: Bool { hasPhoto(data: entry.data) }

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
            let hasSlots = !(entry.data.memberSlots?.isEmpty ?? true)
            if !hasSlots && !showPhoto {
                emptyState
            }

            if entry.data.groupName != nil {
                LinearGradient(colors: [.clear, .black.opacity(0.6)], startPoint: .center, endPoint: .bottom)
                Text(entry.data.groupName ?? "FridgeWall")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(8)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .overlay(alignment: .topTrailing) {
            actionButtonsCompact
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
                            Text(entry.data.groupName ?? "FridgeWall")
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
                iconButton(icon: "camera.fill")
                    .padding(8)
            } else {
                actionButtonsCompact
            }
        }
        .widgetURL(widgetTapURL)
    }

    private var widgetTapURL: URL? {
        if family == .systemSmall { return uploadURL }
        let photos = resolvedPhotos(from: entry.data)
        if photos.count > 1 { return nextPhotoURL }
        return galleryURL
    }

    private var actionButtonsCompact: some View {
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

// MARK: - Container background (iOS 17+)

struct WidgetContainerBackground: View {
    let data: WidgetData
    @Environment(\.widgetFamily) var family

    var body: some View {
        if family == .systemLarge {
            if let slots = data.memberSlots, !slots.isEmpty {
                MosaicWidgetView(slots: slots)
            } else {
                WidgetPhotoBackground(photo: activePhoto(from: data))
            }
        } else {
            WidgetPhotoBackground(photo: activePhoto(from: data))
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
                    .containerBackground(for: .widget) {
                        WidgetContainerBackground(data: entry.data)
                    }
            } else {
                ZStack {
                    WidgetContainerBackground(data: entry.data)
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
