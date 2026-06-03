import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { WIDGET_DATA_KEY } from './widgetTaskHandler';
import type { StoredWidgetData } from './types';
import {
  saveWidgetDataNative,
  advanceWidgetCarouselNative,
} from '@/modules/FridgeWallSharedData';

export async function saveWidgetData(data: StoredWidgetData): Promise<void> {
  // #region agent log
  fetch('http://127.0.0.1:7833/ingest/fd95910a-cb48-4683-9e51-9302b10846ef',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'46b5be'},body:JSON.stringify({sessionId:'46b5be',location:'widgets/updateWidget.ts:saveWidgetData',message:'saveWidgetData called',data:{photosCount:data.photos?.length??0,hasRootPhotoUrl:!!data.photoUrl,groupName:data.groupName},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  try {
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
  } catch (e) {
    // #region agent log
    fetch('http://127.0.0.1:7833/ingest/fd95910a-cb48-4683-9e51-9302b10846ef',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'46b5be'},body:JSON.stringify({sessionId:'46b5be',location:'widgets/updateWidget.ts:saveWidgetData',message:'saveWidgetData error',data:{error:String(e)},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
    // #endregion
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
