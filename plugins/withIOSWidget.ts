/**
 * Config plugin que agrega el Widget Extension de iOS al proyecto Xcode.
 * Se activa automáticamente al tener Apple Developer account y hacer EAS Build.
 *
 * Qué hace:
 * 1. Agrega App Groups entitlement a la app principal (group.com.fridgewall.app)
 * 2. Crea un Widget Extension target en Xcode
 * 3. Copia los archivos Swift del widget
 * 4. Agrega App Groups al widget target
 */

import {
  ConfigPlugin,
  withEntitlementsPlist,
  withXcodeProject,
  withDangerousMod,
  IOSConfig,
} from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

const APP_GROUP = 'group.com.fridgewall.app';
const WIDGET_TARGET = 'FridgeWallWidget';
const WIDGET_BUNDLE_ID = 'com.fridgewall.app.widget';

// 1. Agregar App Groups entitlement a la app principal
const withAppGroupEntitlement: ConfigPlugin = (config) => {
  return withEntitlementsPlist(config, (mod) => {
    const entitlements = mod.modResults;
    const existing: string[] = entitlements['com.apple.security.application-groups'] ?? [];
    if (!existing.includes(APP_GROUP)) {
      entitlements['com.apple.security.application-groups'] = [...existing, APP_GROUP];
    }
    return mod;
  });
};

// 2. Copiar archivos Swift del widget al directorio iOS
const withWidgetFiles: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    'ios',
    (mod) => {
      const iosDir = mod.modRequest.platformProjectRoot;
      const widgetDir = path.join(iosDir, WIDGET_TARGET);

      if (!fs.existsSync(widgetDir)) {
        fs.mkdirSync(widgetDir, { recursive: true });
      }

      // Copiar FridgeWallWidget.swift
      const src = path.join(mod.modRequest.projectRoot, 'ios-widget', 'FridgeWallWidget.swift');
      const dst = path.join(widgetDir, 'FridgeWallWidget.swift');
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
      }

      // Crear Info.plist para el widget extension
      const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>`;
      fs.writeFileSync(path.join(widgetDir, 'Info.plist'), infoPlist);

      // Crear entitlements para el widget (App Groups)
      const widgetEntitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP}</string>
  </array>
</dict>
</plist>`;
      fs.writeFileSync(path.join(widgetDir, `${WIDGET_TARGET}.entitlements`), widgetEntitlements);

      return mod;
    },
  ]);
};

// 3. Agregar el Widget Extension target al proyecto Xcode
const withWidgetTarget: ConfigPlugin = (config) => {
  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const targetName = WIDGET_TARGET;

    // Verificar si el target ya existe
    const targets = project.pbxNativeTargetSection();
    const alreadyExists = Object.values(targets).some(
      (t: any) => t && t.name === targetName,
    );
    if (alreadyExists) return mod;

    // Agregar grupo de archivos para el widget
    const widgetGroup = project.addPbxGroup(
      ['FridgeWallWidget.swift', 'Info.plist', `${WIDGET_TARGET}.entitlements`],
      WIDGET_TARGET,
      WIDGET_TARGET,
    );

    // Agregar el grupo al grupo raíz del proyecto
    const mainGroupId = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup(widgetGroup.uuid, mainGroupId);

    // Agregar el target de extensión
    const widgetTarget = project.addTarget(
      targetName,
      'app_extension',
      targetName,
      WIDGET_BUNDLE_ID,
    );

    // Build settings para el widget
    project.addBuildProperty('SWIFT_VERSION', '5.0', 'Debug', targetName);
    project.addBuildProperty('SWIFT_VERSION', '5.0', 'Release', targetName);
    project.addBuildProperty('TARGETED_DEVICE_FAMILY', '1,2', 'Debug', targetName);
    project.addBuildProperty('TARGETED_DEVICE_FAMILY', '1,2', 'Release', targetName);
    project.addBuildProperty('IPHONEOS_DEPLOYMENT_TARGET', '16.0', 'Debug', targetName);
    project.addBuildProperty('IPHONEOS_DEPLOYMENT_TARGET', '16.0', 'Release', targetName);
    project.addBuildProperty(
      'CODE_SIGN_ENTITLEMENTS',
      `${WIDGET_TARGET}/${WIDGET_TARGET}.entitlements`,
      'Debug',
      targetName,
    );
    project.addBuildProperty(
      'CODE_SIGN_ENTITLEMENTS',
      `${WIDGET_TARGET}/${WIDGET_TARGET}.entitlements`,
      'Release',
      targetName,
    );

    // Embeber el widget extension en la app principal
    const mainTarget = project.getFirstTarget().firstTarget;
    if (mainTarget && widgetTarget) {
      const copyFilesPhase = project.addBuildPhase(
        [],
        'PBXCopyFilesBuildPhase',
        'Embed Foundation Extensions',
        mainTarget.uuid,
        'app_extension',
      );
      if (copyFilesPhase) {
        project.addFile(`${targetName}.appex`, copyFilesPhase.buildPhase.uuid);
      }
    }

    return mod;
  });
};

// Plugin compuesto
const withIOSWidget: ConfigPlugin = (config) => {
  config = withAppGroupEntitlement(config);
  config = withWidgetFiles(config);
  config = withWidgetTarget(config);
  return config;
};

export default withIOSWidget;
