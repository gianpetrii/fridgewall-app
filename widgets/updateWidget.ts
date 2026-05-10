import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { WIDGET_DATA_KEY, type StoredWidgetData } from './widgetTaskHandler';
import { saveWidgetDataNative } from '@/modules/FridgeWallSharedData';

export async function saveWidgetData(data: StoredWidgetData): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));

    if (Platform.OS === 'android') {
      // Android: react-native-android-widget actualiza el widget nativo
      const { requestWidgetUpdate } = await import('react-native-android-widget');
      await requestWidgetUpdate({
        widgetName: 'FridgeWall',
        renderWidget: async () => {
          // El widgetTaskHandler se encarga del render al recibir el update
        },
      });
    } else if (Platform.OS === 'ios') {
      // iOS: nuestro native module escribe en AppGroup UserDefaults
      // y fuerza un reload de WidgetKit
      saveWidgetDataNative(data);
    }
  } catch {
    // No interrumpir el flujo principal si el widget falla
  }
}
