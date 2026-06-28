/**
 * Config plugin que inyecta modular headers para dependencias de Firebase en el
 * Podfile. AppCheckCore (dependencia de Firebase) es un pod Swift que importa
 * GoogleUtilities y RecaptchaInterop, los cuales necesitan generar module maps.
 *
 * Sin esto, `pod install` falla con:
 *   "The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and
 *    `RecaptchaInterop`, which do not define modules."
 *
 * Usamos modular_headers solo para esos pods (no global con use_modular_headers!,
 * que rompe los pods de React Native con "Redefinition of module 'ReactCommon'").
 *
 * Va como plugin porque prebuild regenera el Podfile desde cero y borraría un
 * cambio manual.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const INJECT_MARKER = 'GoogleUtilities';
const INJECT_LINES = `
  # Firebase: AppCheckCore (Swift) requiere module maps de estos pods.
  pod 'GoogleUtilities', :modular_headers => true
  pod 'RecaptchaInterop', :modular_headers => true
`;

const withFirebaseModularHeaders = (config) => {
  return withDangerousMod(config, [
    'ios',
    (mod) => {
      const podfilePath = path.join(mod.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (contents.includes(`pod '${INJECT_MARKER}'`)) {
        return mod; // ya inyectado
      }

      // Insertar justo después de `config = use_native_modules!(config_command)`
      const anchor = 'config = use_native_modules!(config_command)';
      if (contents.includes(anchor)) {
        contents = contents.replace(anchor, `${anchor}\n${INJECT_LINES}`);
        fs.writeFileSync(podfilePath, contents);
      }

      return mod;
    },
  ]);
};

module.exports = withFirebaseModularHeaders;
