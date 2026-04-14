import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';

const ADMIN_UID = process.env.EXPO_PUBLIC_ADMIN_UID ?? '';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.35 }}>{emoji}</Text>;
}

export default function AppLayout() {
  const { session, loading, user } = useAuthStore();
  const isAdmin = !!ADMIN_UID && user?.id === ADMIN_UID;

  useEffect(() => {
    if (!loading && !session) router.replace('/(auth)/login');
  }, [session, loading]);

  if (!session) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      tabBarStyle: {
        backgroundColor: '#ffffff',
        borderTopColor: '#e4e4e7',
        borderTopWidth: 1,
        height: 60,
        paddingBottom: 6,
      },
      tabBarActiveTintColor: '#4f46e5',
      tabBarInactiveTintColor: '#a1a1aa',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Mapa', tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} /> }}
      />
      <Tabs.Screen
        name="events"
        options={{ title: 'Eventos', tabBarIcon: ({ focused }) => <TabIcon emoji="⚡" focused={focused} /> }}
      />
      <Tabs.Screen
        name="places"
        options={{ title: 'Ubicaciones', tabBarIcon: ({ focused }) => <TabIcon emoji="📍" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Perfil', tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
          tabBarItemStyle: isAdmin ? {} : { display: 'none' },
        }}
      />
    </Tabs>
  );
}
