import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { WIDGET_DATA_KEY, type StoredWidgetData } from './widgetTaskHandler';

export async function saveWidgetData(data: StoredWidgetData): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
    if (Platform.OS === 'android') {
      const { requestWidgetUpdate } = await import('react-native-android-widget');
      await requestWidgetUpdate({
        widgetName: 'FridgeWall',
        renderWidget: async () => {
          // El widgetTaskHandler se encarga del render al recibir el update
        },
      });
    }
  } catch {
    // silently fail — no interrumpir el flujo principal
  }
}
