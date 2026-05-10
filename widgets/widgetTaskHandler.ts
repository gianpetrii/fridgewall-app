import React from 'react';
import { renderWidget, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FridgeWallWidget } from './FridgeWallWidget';

export const WIDGET_DATA_KEY = '@fridgewall/widget_data';

export interface StoredWidgetData {
  photoUrl?: string;
  groupName?: string;
  posterName?: string;
  createdAt?: number;
}

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
  const { widgetAction, widgetInfo } = props;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const data = await getWidgetData();
      await renderWidget({
        widgetName: widgetInfo.widgetName,
        renderTree: React.createElement(FridgeWallWidget, {
          photoUrl: data.photoUrl,
          groupName: data.groupName,
          posterName: data.posterName,
          timeAgo: data.createdAt ? timeAgo(data.createdAt) : undefined,
        }),
      });
      break;
    }

    case 'WIDGET_CLICK':
      // La app abre el feed al tocar el widget
      break;

    case 'WIDGET_REMOVED':
      break;

    default:
      break;
  }
}
