import React from 'react';
import { FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetMemberSlot } from './types';

export interface WidgetData {
  photoUrl?: string;
  groupName?: string;
  posterName?: string;
  timeAgo?: string;
  memberSlots?: WidgetMemberSlot[];
  carouselCount?: number;
  carouselIndex?: number;
}

function EmptyWidget() {
  return (
    <FlexWidget
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#09090b',
        borderRadius: 16,
      }}
    >
      <TextWidget text="🧲" style={{ fontSize: 32 }} />
      <TextWidget
        text="FridgeWall"
        style={{
          color: '#ffffff',
          fontSize: 15,
          fontFamily: 'sans-serif-medium',
          marginTop: 6,
        }}
      />
      <TextWidget
        text="Tocá para agregar una foto"
        style={{
          color: '#a1a1aa',
          fontSize: 11,
          fontFamily: 'sans-serif',
          marginTop: 4,
        }}
      />
    </FlexWidget>
  );
}

function MemberTile({ slot }: { slot: WidgetMemberSlot }) {
  const initial = (slot.userName ?? slot.userId ?? '?').charAt(0).toUpperCase();
  if (slot.photoUrl) {
    return (
      <FlexWidget style={{ flex: 1, backgroundColor: '#27272a' }}>
        <ImageWidget
          image={{ uri: slot.photoUrl }}
          imageWidth={120}
          imageHeight={120}
          style={{ width: 'match_parent', height: 'match_parent' }}
        />
      </FlexWidget>
    );
  }
  return (
    <FlexWidget
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#3f3f46',
      }}
    >
      <TextWidget
        text={initial}
        style={{ color: '#ffffff', fontSize: 20, fontFamily: 'sans-serif-medium' }}
      />
    </FlexWidget>
  );
}

function MosaicWidget({ slots, groupName }: { slots: WidgetMemberSlot[]; groupName?: string }) {
  const shown = slots.slice(0, 4);
  const row1 = shown.slice(0, 2);
  const row2 = shown.slice(2, 4);

  return (
    <FlexWidget
      style={{
        flex: 1,
        flexDirection: 'column',
        backgroundColor: '#09090b',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <FlexWidget style={{ flex: 1, flexDirection: 'row' }}>
        {row1.map((slot) => (
          <MemberTile key={slot.userId} slot={slot} />
        ))}
      </FlexWidget>
      {row2.length > 0 ? (
        <FlexWidget style={{ flex: 1, flexDirection: 'row', marginTop: 2 }}>
          {row2.map((slot) => (
            <MemberTile key={slot.userId} slot={slot} />
          ))}
        </FlexWidget>
      ) : null}
      {groupName ? (
        <FlexWidget style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
          <TextWidget
            text={groupName}
            style={{ color: '#ffffff', fontSize: 12, fontFamily: 'sans-serif-medium' }}
          />
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

export function FridgeWallWidget({
  photoUrl,
  groupName,
  posterName,
  timeAgo,
  memberSlots,
  carouselCount = 0,
  carouselIndex = 0,
}: WidgetData) {
  if (memberSlots && memberSlots.length >= 2) {
    return <MosaicWidget slots={memberSlots} groupName={groupName} />;
  }

  if (!photoUrl) {
    return <EmptyWidget />;
  }

  const showCarouselHint = carouselCount > 1;
  const carouselLabel = showCarouselHint
    ? `${(carouselIndex % carouselCount) + 1}/${carouselCount}`
    : '';

  return (
    <FlexWidget
      clickAction={showCarouselHint ? 'NEXT_PHOTO' : 'OPEN_APP'}
      style={{
        flex: 1,
        flexDirection: 'column',
        backgroundColor: '#09090b',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <FlexWidget style={{ flex: 1 }}>
        <ImageWidget
          image={{ uri: photoUrl }}
          imageWidth={320}
          imageHeight={280}
          style={{ width: 'match_parent', height: 'match_parent' }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: '#09090b',
        }}
      >
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget
            text={groupName ?? 'FridgeWall'}
            style={{
              color: '#ffffff',
              fontSize: 13,
              fontFamily: 'sans-serif-medium',
            }}
          />
          {posterName ? (
            <TextWidget
              text={`de ${posterName}`}
              style={{
                color: '#a1a1aa',
                fontSize: 11,
                fontFamily: 'sans-serif',
              }}
            />
          ) : null}
        </FlexWidget>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          {carouselLabel ? (
            <TextWidget
              text={carouselLabel}
              style={{
                color: '#71717a',
                fontSize: 10,
                fontFamily: 'sans-serif',
              }}
            />
          ) : null}
          <TextWidget
            text={timeAgo ?? ''}
            style={{
              color: '#71717a',
              fontSize: 11,
              fontFamily: 'sans-serif',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
