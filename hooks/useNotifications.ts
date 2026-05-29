import * as React from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { savePushToken } from '@/lib/notifications';
import type { PushNotificationToken } from '@/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface UseNotificationsReturn {
  expoPushToken: PushNotificationToken | null;
  permissionStatus: Notifications.PermissionStatus | null;
  requestPermissions: (userId: string) => Promise<boolean>;
}

export function useNotifications(): UseNotificationsReturn {
  const [expoPushToken, setExpoPushToken] = React.useState<PushNotificationToken | null>(null);
  const [permissionStatus, setPermissionStatus] =
    React.useState<Notifications.PermissionStatus | null>(null);

  const requestPermissions = React.useCallback(async (userId: string): Promise<boolean> => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    setPermissionStatus(finalStatus);
    if (finalStatus !== 'granted') return false;

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '31fb7103-b833-4112-acf8-f9c173438bc0',
      });
      const token: PushNotificationToken = {
        token: tokenData.data,
        platform: Platform.OS as 'ios' | 'android',
      };
      setExpoPushToken(token);
      await savePushToken(userId, tokenData.data);
    } catch {
      // Solo funciona en dispositivo físico
    }

    return true;
  }, []);

  return { expoPushToken, permissionStatus, requestPermissions };
}
