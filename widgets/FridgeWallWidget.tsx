import React from 'react';
import { FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget';

export interface WidgetData {
  photoUrl?: string;
  groupName?: string;
  posterName?: string;
  timeAgo?: string;
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
      <TextWidget
        text="🧲"
        style={{ fontSize: 32 }}
      />
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
        text="Abrí la app para ver fotos"
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

export function FridgeWallWidget({ photoUrl, groupName, posterName, timeAgo }: WidgetData) {
  if (!photoUrl) {
    return <EmptyWidget />;
  }

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
      {/* Foto */}
      <FlexWidget style={{ flex: 1 }}>
        <ImageWidget
          image={photoUrl}
          imageWidth={320}
          imageHeight={280}
          style={{ width: '100%', height: '100%' }}
        />
      </FlexWidget>

      {/* Footer */}
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
  );
}
