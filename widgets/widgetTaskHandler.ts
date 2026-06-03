import React from 'react';
import { renderWidget, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FridgeWallWidget } from './FridgeWallWidget';
import type { StoredWidgetData } from './types';

export const WIDGET_DATA_KEY = '@fridgewall/widget_data';

export type { StoredWidgetData, WidgetPhotoItem, WidgetMemberSlot } from './types';

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${d}d`;
}

function activePhoto(data: StoredWidgetData) {
  if (data.photos && data.photos.length > 0) {
    const idx = (data.carouselIndex ?? 0) % data.photos.length;
    return data.photos[idx];
  }
  if (data.photoUrl) {
    return {
      photoUrl: data.photoUrl,
      posterName: data.posterName,
      createdAt: data.createdAt ?? Date.now(),
    };
  }
  return null;
}

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
  const { widgetAction, widgetInfo, clickAction } = props;

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
      const photo = activePhoto(data);
      await renderWidget({
        widgetName: widgetInfo.widgetName,
        renderTree: React.createElement(FridgeWallWidget, {
          photoUrl: photo?.photoUrl,
          groupName: data.groupName,
          posterName: photo?.posterName,
          timeAgo: photo?.createdAt ? timeAgo(photo.createdAt) : undefined,
          memberSlots: data.memberSlots,
          carouselCount: data.photos?.length ?? (photo ? 1 : 0),
          carouselIndex: data.carouselIndex ?? 0,
        }),
      });
      break;
    }

    case 'WIDGET_CLICK': {
      if (clickAction === 'NEXT_PHOTO') {
        const data = await getWidgetData();
        const count = data.photos?.length ?? 0;
        if (count > 1) {
          const nextIndex = ((data.carouselIndex ?? 0) + 1) % count;
          await AsyncStorage.setItem(
            WIDGET_DATA_KEY,
            JSON.stringify({ ...data, carouselIndex: nextIndex }),
          );
          const { requestWidgetUpdate } = await import('react-native-android-widget');
          const dataAfter = await getWidgetData();
          const photoAfter = activePhoto(dataAfter);
          await requestWidgetUpdate({
            widgetName: widgetInfo.widgetName,
            renderWidget: () =>
              React.createElement(FridgeWallWidget, {
                photoUrl: photoAfter?.photoUrl,
                groupName: dataAfter.groupName,
                posterName: photoAfter?.posterName,
                timeAgo: photoAfter?.createdAt ? timeAgo(photoAfter.createdAt) : undefined,
                memberSlots: dataAfter.memberSlots,
                carouselCount: dataAfter.photos?.length ?? (photoAfter ? 1 : 0),
                carouselIndex: dataAfter.carouselIndex ?? 0,
              }),
          });
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
