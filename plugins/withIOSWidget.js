/**
 * Config plugin que agrega el Widget Extension de iOS al proyecto Xcode.
 * Se activa automáticamente al tener Apple Developer account y hacer EAS Build.
 */

const {
  withEntitlementsPlist,
  withXcodeProject,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const APP_GROUP = 'group.com.fridgewall.app';
const WIDGET_TARGET = 'FridgeWallWidget';
const WIDGET_BUNDLE_ID = 'com.fridgewall.app.widget';

const withAppGroupEntitlement = (config) => {
  return withEntitlementsPlist(config, (mod) => {
    const entitlements = mod.modResults;
    const existing = entitlements['com.apple.security.application-groups'] ?? [];
    if (!existing.includes(APP_GROUP)) {
      entitlements['com.apple.security.application-groups'] = [...existing, APP_GROUP];
    }
    return mod;
  });
};

const withWidgetFiles = (config) => {
  return withDangerousMod(config, [
    'ios',
    (mod) => {
      const iosDir = mod.modRequest.platformProjectRoot;
      const widgetDir = path.join(iosDir, WIDGET_TARGET);

      if (!fs.existsSync(widgetDir)) {
        fs.mkdirSync(widgetDir, { recursive: true });
      }

      const src = path.join(mod.modRequest.projectRoot, 'ios-widget', 'FridgeWallWidget.swift');
      const dst = path.join(widgetDir, 'FridgeWallWidget.swift');
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
      }

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

/**
 * Setea build settings directamente en las configuraciones (Debug/Release) del
 * target. A diferencia de project.addBuildProperty(), acá controlamos el valor
 * exacto, por lo que podemos escribir TARGETED_DEVICE_FAMILY entre comillas
 * ("1,2"). El bug histórico era que addBuildProperty escribía `1,2` sin comillas,
 * lo que rompía el parseo del .pbxproj y CocoaPods.
 */
const setTargetBuildSettings = (project, targetUuid, settings) => {
  const nativeTarget = project.pbxNativeTargetSection()[targetUuid];
  const configListUuid = nativeTarget.buildConfigurationList;
  const configList = project.pbxXCConfigurationList()[configListUuid];
  const xcConfigSection = project.pbxXCBuildConfigurationSection();
  configList.buildConfigurations.forEach((entry) => {
    const buildSettings = xcConfigSection[entry.value].buildSettings;
    Object.keys(settings).forEach((key) => {
      buildSettings[key] = settings[key];
    });
  });
};

const withWidgetTarget = (config) => {
  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const targetName = WIDGET_TARGET;

    const targets = project.pbxNativeTargetSection();
    const alreadyExists = Object.values(targets).some(
      (t) => t && t.name === targetName,
    );
    if (alreadyExists) return mod;

    const widgetGroup = project.addPbxGroup(
      ['FridgeWallWidget.swift', 'Info.plist', `${WIDGET_TARGET}.entitlements`],
      WIDGET_TARGET,
      WIDGET_TARGET,
    );

    const mainGroupId = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup(widgetGroup.uuid, mainGroupId);

    const target = project.addTarget(
      targetName,
      'app_extension',
      targetName,
      WIDGET_BUNDLE_ID,
    );

    // Sources: compila el .swift. Resources/Frameworks vacíos (WidgetKit y
    // SwiftUI se auto-enlazan vía `import` en Swift, no hace falta listarlos).
    project.addBuildPhase(
      ['FridgeWallWidget.swift'],
      'PBXSourcesBuildPhase',
      'Sources',
      target.uuid,
    );
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);

    setTargetBuildSettings(project, target.uuid, {
      PRODUCT_NAME: '"$(TARGET_NAME)"',
      PRODUCT_BUNDLE_IDENTIFIER: WIDGET_BUNDLE_ID,
      INFOPLIST_FILE: `${WIDGET_TARGET}/Info.plist`,
      CODE_SIGN_ENTITLEMENTS: `${WIDGET_TARGET}/${WIDGET_TARGET}.entitlements`,
      SWIFT_VERSION: '5.0',
      TARGETED_DEVICE_FAMILY: '"1,2"',
      // iOS 17: el widget usa AppIntentConfiguration + botones interactivos
      // (Button(intent:)), que requieren deployment target 17.0. Con 16.0 el
      // compilador falla con "AppIntent requires 'perform' available in app
      // extensions for iOS 16.0 and newer".
      IPHONEOS_DEPLOYMENT_TARGET: '17.0',
      APPLICATION_EXTENSION_API_ONLY: 'YES',
      GENERATE_INFOPLIST_FILE: 'YES',
      SKIP_INSTALL: 'YES',
      CURRENT_PROJECT_VERSION: '1',
      MARKETING_VERSION: '1.0.0',
      INFOPLIST_KEY_CFBundleDisplayName: 'FridgeWall',
      LD_RUNPATH_SEARCH_PATHS:
        '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
    });

    // Nota: project.addTarget() ya crea la fase "Copy Files" (PlugIns) que embebe
    // el .appex en la app principal, por lo que no agregamos una fase extra.

    return mod;
  });
};

const withIOSWidget = (config) => {
  config = withAppGroupEntitlement(config);
  config = withWidgetFiles(config);
  config = withWidgetTarget(config);
  return config;
};

module.exports = withIOSWidget;
