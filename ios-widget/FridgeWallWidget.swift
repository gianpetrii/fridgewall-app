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
    var caption: String?
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
// Rotación automática por recarga programada. iOS limita la frecuencia real de
// recargas; 2 min es lo más agresivo que el sistema suele respetar con estabilidad.
private let autoRotateSec = 2 * 60
private let widgetDataKey = "fridgewall_widget_data"
private let allGroupsKey = "fridgewall_all_groups"

/// Escribe el índice del carrusel en el JSON guardado (single source of truth).
private func writeCarouselIndex(_ index: Int, key: String, defaults: UserDefaults?) {
    guard
        let defaults,
        let json = defaults.string(forKey: key),
        let data = json.data(using: .utf8),
        var obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else { return }
    obj["carouselIndex"] = index
    if let newData = try? JSONSerialization.data(withJSONObject: obj),
       let newJson = String(data: newData, encoding: .utf8) {
        defaults.set(newJson, forKey: key)
    }
}

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

    // perform() explícito: con deployment target 16.0 el default de
    // WidgetConfigurationIntent no está disponible en app extensions. Un intent
    // de configuración no ejecuta acción, solo devuelve el resultado.
    func perform() async throws -> some IntentResult {
        return .result()
    }
}

// MARK: - Advance photo intent (iOS 17+: avanza a la siguiente foto sin abrir la app)

struct AdvancePhotoIntent: AppIntent {
    static var title: LocalizedStringResource = "Siguiente foto"
    static var description = IntentDescription("Muestra la próxima foto del wall")

    @Parameter(title: "Wall ID")
    var wallId: String?

    init() {}
    init(wallId: String?) {
        self.wallId = wallId
    }

    func perform() async throws -> some IntentResult {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return .result() }
        let key = wallId.map { "fridgewall_widget_data_\($0)" } ?? widgetDataKey
        guard
            let json = defaults.string(forKey: key),
            let data = json.data(using: .utf8),
            var obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let photos = obj["photos"] as? [[String: Any]]
        else { return .result() }

        // Contamos solo las fotos vigentes (mismo filtro que la vista) para que
        // el índice avance dentro del conjunto realmente visible.
        let nowMs = Date().timeIntervalSince1970 * 1000
        let freshCount = photos.filter { p in
            if let c = p["createdAt"] as? Double { return c + photoTtlMs > nowMs }
            return true
        }.count
        guard freshCount > 1 else { return .result() }

        // Avanzamos desde el índice guardado en vivo (single source of truth).
        // La vista lee este mismo índice, así el cambio es instantáneo: iOS
        // re-renderiza la vista tras el intent sin esperar una recarga.
        let current = obj["carouselIndex"] as? Int ?? 0
        let newIndex = (current + 1) % freshCount
        obj["carouselIndex"] = newIndex
        if let newData = try? JSONSerialization.data(withJSONObject: obj),
           let newJson = String(data: newData, encoding: .utf8) {
            defaults.set(newJson, forKey: key)
        }
        // Reseteamos el timer de rotación automática para no saltar de nuevo
        // inmediatamente después de un avance manual.
        defaults.set(nowMs, forKey: "\(key)_lastAutoAdvance")
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: "FridgeWallWidget")
        }
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

// Las fotos expiran a las 24h (igual que los posts en la app).
private let photoTtlMs: Double = 24 * 60 * 60 * 1000

private func isFresh(_ photo: WidgetPhotoItem) -> Bool {
    // Sin fecha (legacy): la conservamos por compatibilidad.
    guard let created = photo.createdAt else { return true }
    return created + photoTtlMs > Date().timeIntervalSince1970 * 1000
}

private func resolvedPhotos(from data: WidgetData) -> [WidgetPhotoItem] {
    if let photos = data.photos, !photos.isEmpty {
        // Filtramos las vencidas: el dato guardado puede tener fotos viejas
        // que ya expiraron pero no se limpiaron del payload.
        return photos.filter(isFresh)
    }
    if data.photoUrl != nil || data.photoLocalName != nil {
        let legacy = WidgetPhotoItem(
            photoUrl: data.photoUrl,
            photoLocalName: data.photoLocalName,
            posterName: data.posterName,
            createdAt: data.createdAt
        )
        return isFresh(legacy) ? [legacy] : []
    }
    return []
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
        let defaults = UserDefaults(suiteName: appGroupId)
        let key = wallId.map { "fridgewall_widget_data_\($0)" } ?? widgetDataKey
        var base = loadData(for: wallId)
        let photos = resolvedPhotos(from: base)
        let now = Date()

        if photos.count > 1 {
            // Rotación automática "lenta" por recarga: si pasó el intervalo desde
            // el último avance automático, avanzamos el índice guardado. La vista
            // lee ese mismo índice en vivo, así NO usamos entries futuras (que
            // bloqueaban el tap instantáneo).
            let nowMs = now.timeIntervalSince1970 * 1000
            let lastAuto = defaults?.double(forKey: "\(key)_lastAutoAdvance") ?? 0
            if lastAuto == 0 || nowMs - lastAuto >= Double(autoRotateSec) * 1000 {
                let current = base.carouselIndex ?? 0
                let nextIndex = (current + 1) % photos.count
                base.carouselIndex = nextIndex
                writeCarouselIndex(nextIndex, key: key, defaults: defaults)
                defaults?.set(nowMs, forKey: "\(key)_lastAutoAdvance")
            }
            let next = Calendar.current.date(byAdding: .second, value: autoRotateSec, to: now)!
            return Timeline(entries: [FridgeWallEntry(date: now, data: base, wallId: wallId)], policy: .after(next))
        } else {
            let next = Calendar.current.date(byAdding: .minute, value: 30, to: now)!
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

    // Lee el índice en vivo desde el almacenamiento compartido (single source of
    // truth). Así el tap se refleja al instante y la rotación lenta también.
    private var photo: WidgetPhotoItem? {
        let data = loadData(for: wallId)
        let photos = resolvedPhotos(from: data)
        guard !photos.isEmpty else { return nil }
        let index = data.carouselIndex ?? 0
        return photos[index % photos.count]
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

// MARK: - Widget view

struct FridgeWallWidgetView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var cameraURL: URL { URL(string: "fridgewall://camera")! }
    var galleryURL: URL { URL(string: "fridgewall://gallery")! }
    var nextPhotoURL: URL { URL(string: "fridgewall://widget-next")! }
    var uploadURL: URL { URL(string: "fridgewall://upload")! }

    private var liveData: WidgetData { loadData(for: entry.wallId) }
    private var livePhotos: [WidgetPhotoItem] { resolvedPhotos(from: liveData) }
    // Índice en vivo desde el almacenamiento (single source of truth): el tap se
    // refleja al instante y la rotación lenta también escribe acá.
    private var carouselIndex: Int { liveData.carouselIndex ?? 0 }
    private var active: WidgetPhotoItem? {
        let photos = livePhotos
        guard !photos.isEmpty else { return nil }
        return photos[carouselIndex % photos.count]
    }
    private var showPhoto: Bool {
        guard let p = active else { return false }
        return p.photoLocalName != nil || p.photoUrl != nil
    }
    private var canAdvance: Bool { livePhotos.count > 1 }

    // Todos los tamaños muestran una sola foto a pantalla completa.
    var body: some View {
        carouselBody
    }

    /// Envuelve el contenido en un Button(intent:) que avanza a la siguiente foto
    /// sin abrir la app (iOS 17+). En iOS 16 devuelve el contenido sin cambios
    /// (el tap se maneja vía widgetURL).
    @ViewBuilder
    private func advanceWrapper<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        if #available(iOS 17.0, *), canAdvance {
            Button(intent: AdvancePhotoIntent(wallId: entry.wallId)) {
                content()
            }
            .buttonStyle(.plain)
        } else {
            content()
        }
    }

    @ViewBuilder
    private var carouselBody: some View {
        advanceWrapper {
            ZStack(alignment: .bottom) {
                // Capa base transparente: garantiza que toda el área sea tappable
                Color.clear

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
                            // Bottom-left: caption (si existe), estilo "stories"
                            if let caption = active?.caption,
                               !caption.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                Text(caption)
                                    .font(.system(size: 12, weight: .medium))
                                    .italic()
                                    .foregroundColor(.white)
                                    .lineLimit(2)
                                    .shadow(color: .black.opacity(0.6), radius: 3, x: 0, y: 1)
                            }
                            Spacer(minLength: 6)
                            // Bottom-right: hace cuánto (formato corto)
                            if let ts = active?.createdAt {
                                Text(timeAgo(Date(timeIntervalSince1970: ts / 1000)))
                                    .font(.system(size: 11))
                                    .foregroundColor(.white.opacity(0.7))
                            }
                        }
                        .padding(.horizontal, 10)
                        .padding(.bottom, 10)
                    }
                }
            }
        }
        .overlay(alignment: .topLeading) {
            // Top-left: quién publicó
            if showPhoto, let name = active?.posterName {
                Text("de \(name)")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.white.opacity(0.9))
                    .shadow(color: .black.opacity(0.6), radius: 3, x: 0, y: 1)
                    .padding(10)
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
        // iOS 17+ con varias fotos: el tap lo maneja el Button de avance
        if #available(iOS 17.0, *), canAdvance {
            return nil
        }
        if family == .systemSmall { return uploadURL }
        if canAdvance { return nextPhotoURL }
        return galleryURL
    }

    @ViewBuilder
    private var smallActions: some View {
        // En el widget chico hay un solo botón: abre el picker (elegir cámara o galería)
        Link(destination: uploadURL) {
            iconButton(icon: "plus")
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

    // Todos los tamaños muestran una sola foto a pantalla completa.
    var body: some View {
        WidgetPhotoBackground(wallId: wallId)
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
