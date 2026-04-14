import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'HappeningNow',
  slug: 'happeningnow',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  scheme: 'happeningnow',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0f172a',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.happeningnow.app',
    infoPlist: {
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'HappeningNow necesita acceso a tu ubicación para alertarte sobre eventos cercanos.',
      NSLocationWhenInUseUsageDescription:
        'HappeningNow necesita acceso a tu ubicación para mostrar eventos cercanos.',
      NSLocationAlwaysUsageDescription:
        'HappeningNow necesita acceso a tu ubicación en segundo plano para alertarte sobre eventos mientras no usás la app.',
    },
  },
  android: {
    package: 'com.happeningnow.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0f172a',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ],
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  },
  web: {
    bundler: 'metro',
    favicon: './assets/favicon.png',
    output: 'single',
  },
  plugins: [
    'expo-router',
    [
      'expo-calendar',
      {
        calendarPermission: 'HappeningNow necesita acceso al calendario para guardar eventos.',
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'HappeningNow necesita acceso a tu ubicación para alertarte sobre eventos cercanos.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#0f172a',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});
