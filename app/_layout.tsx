import * as React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import { advanceWidgetCarousel } from '@/widgets/updateWidget';
import { returnToDeviceHome } from '@/lib/deviceHome';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useNotifications } from '@/hooks/useNotifications';
import { ShellProviders } from '@/components/layout/ShellProviders';
import {
  appStackScreenOptions,
  authStackScreenOptions,
  modalScreenOptions,
  rootStackScreenOptions,
} from '@/constants/navigation';
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
      if (url.includes('widget-next')) {
        void advanceWidgetCarousel().then(() => {
          returnToDeviceHome();
        });
      } else if (url.includes('camera')) {
        router.push('/upload-modal?source=camera');
      } else if (url.includes('gallery')) {
        router.push('/upload-modal?source=gallery');
      }
    },
    [user, isInitialized, router],
  );

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
    const sub = Linking.addEventListener('url', ({ url }) => {
      navigate(url);
    });
    return () => sub.remove();
  }, [navigate]);

  return null;
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

  React.useEffect(() => {
    if (user?.id) {
      requestPermissions(user.id);
    }
  }, [user?.id]);

  return (
    <ShellProviders>
      <AuthGuard>
        <DeepLinkHandler />
        <Stack screenOptions={rootStackScreenOptions}>
          <Stack.Screen name="(auth)" options={authStackScreenOptions} />
          <Stack.Screen name="(app)" options={appStackScreenOptions} />
          <Stack.Screen name="upload-modal" options={modalScreenOptions} />
          <Stack.Screen name="photo-editor" options={modalScreenOptions} />
          <Stack.Screen name="camera" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="gallery" options={{ headerShown: false, animation: 'none' }} />
        </Stack>
      </AuthGuard>
    </ShellProviders>
  );
}
