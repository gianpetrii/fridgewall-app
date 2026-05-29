import WidgetKit
import SwiftUI

// MARK: - Data model

struct WidgetData: Codable {
    var photoUrl: String?
    var groupName: String?
    var posterName: String?
    var createdAt: Double?
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
        let entry = FridgeWallEntry(date: Date(), data: loadData())
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func loadData() -> WidgetData {
        guard
            let defaults = UserDefaults(suiteName: "group.com.fridgewall.app"),
            let json = defaults.string(forKey: "fridgewall_widget_data"),
            let bytes = json.data(using: .utf8),
            let data = try? JSONDecoder().decode(WidgetData.self, from: bytes)
        else { return WidgetData() }
        return data
    }
}

// MARK: - Views

struct FridgeWallWidgetView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var cameraURL: URL { URL(string: "fridgewall://camera")! }
    var galleryURL: URL { URL(string: "fridgewall://gallery")! }

    var body: some View {
        ZStack(alignment: .bottom) {
            // Foto de fondo
            if let urlString = entry.data.photoUrl, let url = URL(string: urlString) {
                GeometryReader { geo in
                    AsyncImage(url: url) { phase in
                        if let image = phase.image {
                            image.resizable().aspectRatio(contentMode: .fill)
                        } else {
                            Color.black
                        }
                    }
                    .frame(width: geo.size.width, height: geo.size.height)
                    .clipped()
                }
            } else {
                Color(.systemBackground)
                VStack(spacing: 6) {
                    Text("🧲").font(.system(size: 36))
                    Text("FridgeWall")
                        .font(.system(size: 15, weight: .medium))
                    Text("Tocá para agregar una foto")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }

            // Degradado inferior
            if entry.data.photoUrl != nil {
                LinearGradient(
                    colors: [.clear, .black.opacity(0.75)],
                    startPoint: .center,
                    endPoint: .bottom
                )
            }

            // Info + botones
            VStack(spacing: 0) {
                Spacer()

                // Info de la foto
                if entry.data.photoUrl != nil {
                    HStack(alignment: .bottom) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(entry.data.groupName ?? "FridgeWall")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.white)
                            if let name = entry.data.posterName {
                                Text("de \(name)")
                                    .font(.system(size: 11))
                                    .foregroundColor(.white.opacity(0.7))
                            }
                        }
                        Spacer()
                        if let ts = entry.data.createdAt {
                            Text(timeAgo(Date(timeIntervalSince1970: ts / 1000)))
                                .font(.system(size: 11))
                                .foregroundColor(.white.opacity(0.55))
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.bottom, 8)
                }

                // Botones de acción (solo en tamaño mediano y grande)
                if family != .systemSmall {
                    HStack(spacing: 8) {
                        Link(destination: cameraURL) {
                            HStack(spacing: 6) {
                                Image(systemName: "camera.fill")
                                    .font(.system(size: 12))
                                Text("Cámara")
                                    .font(.system(size: 12, weight: .medium))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(.ultraThinMaterial)
                            .cornerRadius(10)
                            .foregroundColor(entry.data.photoUrl != nil ? .white : .primary)
                        }

                        Link(destination: galleryURL) {
                            HStack(spacing: 6) {
                                Image(systemName: "photo.fill")
                                    .font(.system(size: 12))
                                Text("Galería")
                                    .font(.system(size: 12, weight: .medium))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(.ultraThinMaterial)
                            .cornerRadius(10)
                            .foregroundColor(entry.data.photoUrl != nil ? .white : .primary)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.bottom, 12)
                }
            }
        }
        // En tamaño small, toda la vista es un link a la galería
        .widgetURL(family == .systemSmall ? galleryURL : nil)
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

// MARK: - Widget declaration

extension View {
    @ViewBuilder
    func widgetBackground() -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(.black, for: .widget)
        } else {
            self
        }
    }
}

struct FridgeWallWidget: Widget {
    let kind: String = "FridgeWallWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            FridgeWallWidgetView(entry: entry)
                .widgetBackground()
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
