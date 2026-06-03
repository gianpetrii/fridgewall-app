"use client";
import * as React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Home, Users, User } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useWidgetSync } from '@/hooks/useWidgetSync';
import { Colors } from '@/constants/colors';

function NotificationNavigationHandler() {
  const router = useRouter();

  React.useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { groupId?: string };
      if (data?.groupId) {
        router.push('/(app)');
      }
    });
    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function DeferredNotificationHandler() {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => { setReady(true); }, []);
  if (!ready) return null;
  return <NotificationNavigationHandler />;
}

export default function AppLayout() {
  const { resolvedScheme } = useColorScheme();
  const colors = Colors[resolvedScheme];
  useWidgetSync();

  return (
    <>
      <DeferredNotificationHandler />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabIconActive,
          tabBarInactiveTintColor: colors.tabIconInactive,
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.tabBarBorder,
            borderTopWidth: 1,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="groups"
          options={{
            title: 'Walls',
            tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}
