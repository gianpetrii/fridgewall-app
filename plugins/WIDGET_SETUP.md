# Configuración del Widget iOS (manual, una sola vez)

El plugin `withIOSWidget.js` se encarga de:

- Crear App Group `group.com.fridgewall.app` en los entitlements de la app
- Copiar `FridgeWallWidget.swift`, `Info.plist` y `FridgeWallWidget.entitlements` a `ios/FridgeWallWidget/`

Lo que **no** se puede automatizar de forma confiable es agregar el Widget Extension target al `.pbxproj`. Hay que hacerlo una vez desde Xcode.

## Pasos (5 minutos)

1. Abrir `ios/FridgeWall.xcworkspace` en Xcode
2. `File → New → Target...`
3. Elegir **Widget Extension** → Next
4. Configurar:
   - Product Name: `FridgeWallWidget`
   - Bundle Identifier: `com.fridgewall.app.widget`
   - Include Configuration Intent: **desmarcado**
   - Embed in Application: **FridgeWall**
5. Cuando pregunte "Activate FridgeWallWidget scheme?" → Cancel
6. Xcode crea archivos por defecto. **Eliminarlos** (`FridgeWallWidget.swift`, `Info.plist`, etc. que generó Xcode) y reemplazarlos con los que ya existen en `ios/FridgeWallWidget/`:
   - Click derecho en el grupo `FridgeWallWidget` → Add Files to "FridgeWall"
   - Seleccionar los 3 archivos del directorio `ios/FridgeWallWidget/`
7. En el target `FridgeWallWidget`:
   - **Signing & Capabilities**: agregar **App Groups** → marcar `group.com.fridgewall.app`
   - **Build Settings**: setear `iOS Deployment Target` a 16.0
8. Build & Run

## ¿Cuándo hay que repetir esto?

Solo si se borra completo el directorio `ios/` (por ej. `npx expo prebuild --clean`).
Después de `expo run:ios` normal, el target queda persistido en el `.pbxproj`.
