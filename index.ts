import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  // Se registra antes de montar el router: el headless task del widget puede arrancar
  // el bundle sin que haya Activity.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { widgetTaskHandler } = require('./widgets/widgetTaskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('expo-router/entry');
