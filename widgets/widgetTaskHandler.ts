import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createFridgeWallWidgetElement } from './renderFridgeWallWidget';
import type { StoredWidgetData } from './types';

export const WIDGET_DATA_KEY = '@fridgewall/widget_data';

export type { StoredWidgetData, WidgetPhotoItem, WidgetMemberSlot } from './types';

async function getWidgetData(): Promise<StoredWidgetData> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (raw) return JSON.parse(raw) as StoredWidgetData;
  } catch {
    // silently fail
  }
  return {};
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, clickAction, renderWidget } = props;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      let data = await getWidgetData();
      const count = data.photos?.length ?? 0;
      if (widgetAction === 'WIDGET_UPDATE' && count > 1) {
        const nextIndex = ((data.carouselIndex ?? 0) + 1) % count;
        data = { ...data, carouselIndex: nextIndex };
        await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
      }
      renderWidget(createFridgeWallWidgetElement(data));
      break;
    }

    case 'WIDGET_CLICK': {
      if (clickAction === 'NEXT_PHOTO') {
        const data = await getWidgetData();
        const count = data.photos?.length ?? 0;
        if (count > 1) {
          const nextIndex = ((data.carouselIndex ?? 0) + 1) % count;
          const dataAfter = { ...data, carouselIndex: nextIndex };
          await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(dataAfter));
          renderWidget(createFridgeWallWidgetElement(dataAfter));
        }
      }
      break;
    }

    case 'WIDGET_DELETED':
      break;

    default:
      break;
  }
}
