import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('events', {
      name: 'Eventos',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    // En Expo Go sin projectId configurado, el push token remoto no está disponible.
    // Las notificaciones locales (geofencing) funcionan igual.
    return 'local-only';
  }
}

export async function savePushToken(userId: string, token: string) {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      { user_id: userId, expo_push_token: token },
      { onConflict: 'user_id' }
    );
  if (error) console.error('Error saving push token:', error);
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: data ?? {}, sound: true },
    trigger: null,
  });
}
