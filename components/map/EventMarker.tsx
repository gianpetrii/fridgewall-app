import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Marker, Circle } from 'react-native-maps';
import { AppEvent } from '../../types';
const ACCENT = '#4f46e5';

const CATEGORY_ICONS: Record<AppEvent['category'], string> = {
  concert: '🎵',
  sports: '⚽',
  festival: '🎉',
  march: '✊',
  other: '📍',
};

interface EventMarkerProps {
  event: AppEvent;
  onPress: (event: AppEvent) => void;
}

export function EventMarker({ event, onPress }: EventMarkerProps) {
  return (
    <>
      <Circle
        center={{ latitude: event.lat, longitude: event.lng }}
        radius={event.radius_meters}
        fillColor={`${ACCENT}20`}
        strokeColor={`${ACCENT}60`}
        strokeWidth={1.5}
      />
      <Marker
        coordinate={{ latitude: event.lat, longitude: event.lng }}
        onPress={() => onPress(event)}
        tracksViewChanges={false}
      >
        <View style={[styles.marker, { backgroundColor: ACCENT }]}>
          <Text style={styles.icon}>{CATEGORY_ICONS[event.category]}</Text>
        </View>
      </Marker>
    </>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  icon: {
    fontSize: 18,
  },
});
