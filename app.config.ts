import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'FridgeWall',
  slug: 'fridgewall-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  scheme: 'fridgewall',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#09090b',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.fridgewall.app',
    infoPlist: {
      NSPhotoLibraryUsageDescription: 'FridgeWall necesita acceso a tu galería para compartir fotos con tu círculo.',
      NSCameraUsageDescription: 'FridgeWall necesita acceso a tu cámara para tomar fotos.',
    },
  },
  android: {
    package: 'com.fridgewall.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#09090b',
    },
    edgeToEdgeEnabled: true,
    permissions: [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.CAMERA',
    ],
  },
  web: {
    bundler: 'metro',
    favicon: './assets/favicon.png',
    output: 'single',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-image-picker',
    './plugins/withIOSWidget',
    [
      'react-native-android-widget',
      {
        widgets: [
          {
            name: 'FridgeWall',
            label: 'FridgeWall',
            minWidth: '250dp',
            minHeight: '110dp',
            description: 'Fotos de tu círculo en la pantalla de inicio',
            updatePeriodMillis: 1800000,
          },
        ],
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#09090b',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#09090b',
        image: './assets/splash-icon.png',
        imageWidth: 200,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: '31fb7103-b833-4112-acf8-f9c173438bc0',
    },
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  },
});
