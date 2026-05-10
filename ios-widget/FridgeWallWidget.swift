import WidgetKit
import SwiftUI

// MARK: - Data model (shared con la app via AppGroup UserDefaults)

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
        // Se refresca a los 15 minutos, pero el push notification fuerza un reload antes
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

    var body: some View {
        if let urlString = entry.data.photoUrl, let url = URL(string: urlString) {
            GeometryReader { geo in
                ZStack(alignment: .bottom) {
                    AsyncImage(url: url) { phase in
                        if let image = phase.image {
                            image.resizable().aspectRatio(contentMode: .fill)
                        } else {
                            Color.black
                        }
                    }
                    .frame(width: geo.size.width, height: geo.size.height)
                    .clipped()

                    // Degradado sobre la imagen para leer el texto
                    LinearGradient(
                        colors: [.clear, .black.opacity(0.8)],
                        startPoint: .center,
                        endPoint: .bottom
                    )

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
                    .padding(.bottom, 12)
                }
            }
        } else {
            ZStack {
                Color(.systemBackground)
                VStack(spacing: 6) {
                    Text("🧲").font(.system(size: 36))
                    Text("FridgeWall")
                        .font(.system(size: 15, weight: .medium))
                    Text("Abrí la app para empezar")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                }
            }
        }
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

struct FridgeWallWidget: Widget {
    let kind: String = "FridgeWallWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            FridgeWallWidgetView(entry: entry)
                .containerBackground(.black, for: .widget)
        }
        .configurationDisplayName("FridgeWall")
        .description("Fotos de tu círculo en la pantalla de inicio")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

@main
struct FridgeWallWidgetBundle: WidgetBundle {
    var body: some Widget {
        FridgeWallWidget()
    }
}
