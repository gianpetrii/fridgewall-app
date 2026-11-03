import React from 'react';
import { FridgeWallWidget } from './FridgeWallWidget';
import type { StoredWidgetData } from './types';

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

export function activeWidgetPhoto(data: StoredWidgetData) {
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

export function createFridgeWallWidgetElement(data: StoredWidgetData) {
  const photo = activeWidgetPhoto(data);
  const count = data.photos?.length ?? 0;
  return React.createElement(FridgeWallWidget, {
    photoUrl: photo?.photoUrl,
    groupName: data.groupName,
    posterName: photo?.posterName,
    timeAgo: photo?.createdAt ? timeAgo(photo.createdAt) : undefined,
    memberSlots: data.memberSlots,
    carouselCount: count > 0 ? count : photo ? 1 : 0,
    carouselIndex: data.carouselIndex ?? 0,
  });
}
