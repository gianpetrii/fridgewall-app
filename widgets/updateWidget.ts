import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { WIDGET_DATA_KEY } from './widgetTaskHandler';
import type { StoredWidgetData, GroupInfo } from './types';
import {
  saveWidgetDataNative,
  saveWidgetDataForGroupNative,
  saveAllGroupsNative,
  advanceWidgetCarouselNative,
} from '@/modules/FridgeWallSharedData';

export async function saveWidgetData(data: StoredWidgetData): Promise<void> {
  try {
    console.log('[Widget] saveWidgetData called, photos:', data.photos?.length ?? 0, 'groupName:', data.groupName);
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));

    if (Platform.OS === 'android') {
      const { requestWidgetUpdate } = await import('react-native-android-widget');
      await requestWidgetUpdate({
        widgetName: 'FridgeWall',
        renderWidget: async () => {},
      });
    } else if (Platform.OS === 'ios') {
      await saveWidgetDataNative(data);
    }
    console.log('[Widget] saveWidgetData done');
  } catch (e) {
    console.error('[Widget] saveWidgetData FAILED', String(e));
  }
}

export async function saveWidgetDataForGroup(groupId: string, data: StoredWidgetData): Promise<void> {
  try {
    await AsyncStorage.setItem(`${WIDGET_DATA_KEY}_${groupId}`, JSON.stringify(data));
    if (Platform.OS === 'ios') {
      await saveWidgetDataForGroupNative(groupId, data);
    }
  } catch {
    // silently fail
  }
}

export async function saveGroupsList(groups: GroupInfo[]): Promise<void> {
  if (Platform.OS === 'ios') {
    await saveAllGroupsNative(groups);
  }
}

export async function advanceWidgetCarousel(): Promise<void> {
  if (Platform.OS === 'ios') {
    await advanceWidgetCarouselNative();
    return;
  }
  const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
  if (!raw) return;
  const data = JSON.parse(raw) as StoredWidgetData;
  const count = data.photos?.length ?? 0;
  if (count <= 1) return;
  const nextIndex = ((data.carouselIndex ?? 0) + 1) % count;
  await saveWidgetData({ ...data, carouselIndex: nextIndex });
}
