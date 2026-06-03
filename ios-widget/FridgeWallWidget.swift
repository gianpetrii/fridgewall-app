import WidgetKit
import SwiftUI
import UIKit

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

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> FridgeWallEntry {
        FridgeWallEntry(date: Date(), data: WidgetData(groupName: "Mi familia"))
    }

    func getSnapshot(in context: Context, completion: @escaping (FridgeWallEntry) -> Void) {
        completion(FridgeWallEntry(date: Date(), data: loadData()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FridgeWallEntry>) -> Void) {
        let base = loadData()
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
            completion(Timeline(entries: entries, policy: .after(reload)))
        } else {
            let next = Calendar.current.date(byAdding: .minute, value: 15, to: now)!
            completion(Timeline(entries: [FridgeWallEntry(date: now, data: base)], policy: .after(next)))
        }
    }

    private func loadData() -> WidgetData {
        guard
            let defaults = UserDefaults(suiteName: appGroupId),
            let json = defaults.string(forKey: "fridgewall_widget_data"),
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
                    .padding(.bottom, 8)

                    if family != .systemSmall {
                        actionButtons.padding(.bottom, 12)
                    }
                }
            } else if family != .systemSmall {
                VStack {
                    Spacer()
                    actionButtons.padding(.bottom, 12)
                }
            }
        }
        .widgetURL(widgetTapURL)
    }

    private var widgetTapURL: URL? {
        let photos = resolvedPhotos(from: entry.data)
        if photos.count > 1 { return nextPhotoURL }
        return galleryURL
    }

    private var actionButtons: some View {
        HStack(spacing: 8) {
            Link(destination: cameraURL) {
                labelButton(icon: "camera.fill", title: "Cámara")
            }
            Link(destination: galleryURL) {
                labelButton(icon: "photo.fill", title: "Galería")
            }
        }
        .padding(.horizontal, 12)
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

    private func labelButton(icon: String, title: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 12))
            Text(title)
                .font(.system(size: 12, weight: .medium))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial)
        .cornerRadius(10)
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
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
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
