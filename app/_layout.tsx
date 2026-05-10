import * as React from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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

export default function RootLayout() {
  const { initialize: initAuth, user } = useAuthStore();
  const { initialize: initTheme } = useThemeStore();
  const { requestPermissions } = useNotifications();

  React.useEffect(() => {
    async function bootstrap() {
      await initTheme();
      await initAuth();
      await SplashScreen.hideAsync();
    }
    bootstrap();
  }, [initAuth, initTheme]);

  // Pedir permisos y registrar token cuando el usuario inicia sesión
  React.useEffect(() => {
    if (user?.id) {
      requestPermissions(user.id);
    }
  }, [user?.id]);

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <ToastProvider>
          <AuthGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          </AuthGuard>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
