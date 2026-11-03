/**
 * Fija Kotlin 1.9.25 en Android para que coincida con Compose Compiler 1.5.15
 * (expo-modules-core). Sin esto, RN 0.76 resuelve el plugin de Kotlin en 1.9.24
 * y el build release falla en EAS.
 */
const { withGradleProperties, withProjectBuildGradle } = require('@expo/config-plugins');

const KOTLIN_VERSION = '1.9.25';

const withAndroidKotlinVersion = (config) => {
  config = withGradleProperties(config, (mod) => {
    mod.modResults = mod.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'android.kotlinVersion'),
    );
    mod.modResults.push({
      type: 'property',
      key: 'android.kotlinVersion',
      value: KOTLIN_VERSION,
    });
    return mod;
  });

  config = withProjectBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;
    contents = contents.replace(
      "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')",
      'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")',
    );
    mod.modResults.contents = contents;
    return mod;
  });

  return config;
};

module.exports = withAndroidKotlinVersion;
