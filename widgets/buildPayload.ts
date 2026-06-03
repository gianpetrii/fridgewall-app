import type { Group, Post } from '@/types';
import { WIDGET_MEMBER_LIMIT, WIDGET_PHOTO_LIMIT } from './constants';
import type { StoredWidgetData, WidgetMemberSlot, WidgetPhotoItem } from './types';

/** Campos legacy en raíz para el widget iOS (compat + fallback si falla decode de photos[]) */
function withLegacyPhotoFields(data: StoredWidgetData): StoredWidgetData {
  const first = data.photos?.[0];
  if (!first?.photoUrl) return data;
  return {
    ...data,
    photoUrl: first.photoUrl,
    posterName: first.posterName ?? data.posterName,
    createdAt: first.createdAt ?? data.createdAt,
    photoLocalName: first.photoLocalName ?? data.photoLocalName,
  };
}

export function buildWidgetPayload(posts: Post[], group: Group): StoredWidgetData {
  const photos: WidgetPhotoItem[] = posts.slice(0, WIDGET_PHOTO_LIMIT).map((p) => ({
    photoUrl: p.photoUrl,
    posterName: p.userName,
    createdAt: p.createdAt,
  }));

  const latestByUser = new Map<string, Post>();
  for (const p of posts) {
    if (!latestByUser.has(p.userId)) {
      latestByUser.set(p.userId, p);
    }
  }

  const memberSlots: WidgetMemberSlot[] = group.members.slice(0, WIDGET_MEMBER_LIMIT).map((userId) => {
    const post = latestByUser.get(userId);
    return {
      userId,
      userName: post?.userName,
      photoUrl: post?.photoUrl,
    };
  });

  return withLegacyPhotoFields({
    groupName: group.name,
    photos,
    carouselIndex: 0,
    memberSlots,
  });
}

/** Tras subir una foto, prepend al carousel existente */
export function prependPhotoToPayload(
  existing: StoredWidgetData | null,
  item: WidgetPhotoItem,
  groupName: string,
): StoredWidgetData {
  const prev = existing?.photos ?? [];
  const photos = [item, ...prev.filter((p) => p.photoUrl !== item.photoUrl)].slice(
    0,
    WIDGET_PHOTO_LIMIT,
  );
  return withLegacyPhotoFields({
    ...existing,
    groupName,
    photos,
    carouselIndex: 0,
    memberSlots: existing?.memberSlots,
  });
}
