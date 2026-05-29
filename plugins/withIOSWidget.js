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

    project.addTarget(
      targetName,
      'app_extension',
      targetName,
      WIDGET_BUNDLE_ID,
    );

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

    return mod;
  });
};

const withIOSWidget = (config) => {
  config = withAppGroupEntitlement(config);
  config = withWidgetFiles(config);
  // withWidgetTarget desactivado: la manipulaci\u00f3n autom\u00e1tica del .pbxproj
  // genera valores sin comillas en TARGETED_DEVICE_FAMILY y rompe CocoaPods.
  // El Widget Extension target se agrega manualmente en Xcode una sola vez
  // (ver instrucciones en plugins/WIDGET_SETUP.md).
  return config;
};

module.exports = withIOSWidget;
