import * as React from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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
  requestPermissions: () => Promise<boolean>;
  scheduleLocalNotification: (
    title: string,
    body: string,
    seconds?: number,
  ) => Promise<string>;
}

export function useNotifications(): UseNotificationsReturn {
  const [expoPushToken, setExpoPushToken] = React.useState<PushNotificationToken | null>(null);
  const [permissionStatus, setPermissionStatus] =
    React.useState<Notifications.PermissionStatus | null>(null);

  React.useEffect(() => {
    Notifications.getPermissionsAsync().then((status) => {
      setPermissionStatus(status.status);
    });
  }, []);

  const requestPermissions = React.useCallback(async (): Promise<boolean> => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      setPermissionStatus(existingStatus);
      await registerForPushNotifications();
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionStatus(status);

    if (status !== 'granted') return false;

    await registerForPushNotifications();
    return true;
  }, []);

  async function registerForPushNotifications() {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      setExpoPushToken({
        token: tokenData.data,
        platform: Platform.OS as 'ios' | 'android',
      });
    } catch {
      // Physical device required for push tokens in development
    }
  }

  const scheduleLocalNotification = React.useCallback(
    async (title: string, body: string, seconds = 1): Promise<string> => {
      return Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: { seconds },
      });
    },
    [],
  );

  return {
    expoPushToken,
    permissionStatus,
    requestPermissions,
    scheduleLocalNotification,
  };
}
