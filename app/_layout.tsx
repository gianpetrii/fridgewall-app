import * as React from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ToastProvider } from '@/components/ui/toast';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useNotifications } from '@/hooks/useNotifications';
import '../global.css';

SplashScreen.preventAutoHideAsync();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  React.useEffect(() => {
    if (!isInitialized) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [user, isInitialized, segments, router]);

  if (!isInitialized) {
    return <View className="flex-1 bg-background" />;
  }

  return <>{children}</>;
}

function DeepLinkHandler() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const pendingUrl = React.useRef<string | null>(null);

  const navigate = React.useCallback(
    (url: string) => {
      if (!user || !isInitialized) {
        pendingUrl.current = url;
        return;
      }
      if (url.includes('camera')) {
        router.push('/upload-modal?source=camera');
      } else if (url.includes('gallery')) {
        router.push('/upload-modal?source=gallery');
      }
    },
    [user, isInitialized, router],
  );

  // Resolver URL pendiente cuando el usuario inicia sesión
  React.useEffect(() => {
    if (isInitialized && user && pendingUrl.current) {
      const url = pendingUrl.current;
      pendingUrl.current = null;
      navigate(url);
    }
  }, [isInitialized, user, navigate]);

  React.useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) navigate(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => navigate(url));
    return () => sub.remove();
  }, [navigate]);

  return null;
}

export default function RootLayout() {
  const { initialize: initAuth, user } = useAuthStore();
  const { initialize: initTheme, resolvedScheme } = useThemeStore();
  const { requestPermissions } = useNotifications();

  React.useEffect(() => {
    async function bootstrap() {
      await initTheme();
      await initAuth();
      await SplashScreen.hideAsync();
    }
    bootstrap();
  }, [initAuth, initTheme]);

  React.useEffect(() => {
    if (user?.id) {
      requestPermissions(user.id);
    }
  }, [user?.id]);

  return (
    <GestureHandlerRootView
      className={`flex-1 bg-background ${resolvedScheme === 'dark' ? 'dark' : ''}`}
    >
      <SafeAreaProvider>
        <KeyboardProvider>
          <ToastProvider>
            <AuthGuard>
              <DeepLinkHandler />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(app)" />
                <Stack.Screen
                  name="upload-modal"
                  options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
                />
              </Stack>
            </AuthGuard>
          </ToastProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
