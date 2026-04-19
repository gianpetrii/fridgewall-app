import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'BaseExpoApp',
  slug: 'base-expo-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  scheme: 'base-expo-app',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#09090b',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.baseexpoapp.app',
  },
  android: {
    package: 'com.baseexpoapp.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#09090b',
    },
    edgeToEdgeEnabled: true,
  },
  web: {
    bundler: 'metro',
    favicon: './assets/favicon.png',
    output: 'single',
  },
  plugins: [
    'expo-router',
    'expo-font',
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
    // Supabase
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    // Firebase (uncomment if using Firebase)
    // firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    // firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    // firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    // firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  },
});
