import ExpoModulesCore
import WidgetKit

public class FridgeWallSharedDataModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FridgeWallSharedData")

    // Llamado desde JS con los datos de la última foto
    Function("saveWidgetData") { (jsonString: String) in
      let defaults = UserDefaults(suiteName: "group.com.fridgewall.app")
      defaults?.set(jsonString, forKey: "fridgewall_widget_data")
      defaults?.synchronize()

      // Forzar refresh del widget inmediatamente
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadTimelines(ofKind: "FridgeWallWidget")
      }
    }
  }
}
