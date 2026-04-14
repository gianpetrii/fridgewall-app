import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import MapView, { Region } from 'react-native-maps';
import { useLocation } from '../../hooks/useLocation';
import { useEvents } from '../../hooks/useEvents';
import { EventMarker } from '../../components/map/EventMarker';
import { EventDetailSheet } from '../../components/events/EventDetailSheet';
import { AppEvent } from '../../types';

const BUENOS_AIRES: Region = {
  latitude: -34.6083,
  longitude: -58.3712,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const { coords, loading: locationLoading } = useLocation();
  const { events } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [mapReady, setMapReady] = useState(false);

  function centerOnUser() {
    if (!coords) return;
    mapRef.current?.animateToRegion({
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  }

  return (
    <View className="flex-1">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={coords
          ? { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.1, longitudeDelta: 0.1 }
          : BUENOS_AIRES
        }
        showsUserLocation
        showsMyLocationButton={false}
        onMapReady={() => setMapReady(true)}
        customMapStyle={[]}

      >
        {mapReady && events.map((event) => (
          <EventMarker key={event.id} event={event} onPress={setSelectedEvent} />
        ))}
      </MapView>

      <SafeAreaView className="absolute inset-0" pointerEvents="box-none">
        {/* Header pill */}
        <View className="m-4">
          <View className="self-start bg-white/90 border border-zinc-200 rounded-xl px-4 py-2 gap-0.5">
            <Text className="text-base font-bold text-zinc-900">HappeningNow</Text>
            <Text className="text-xs text-zinc-500">{events.length} eventos activos</Text>
          </View>
        </View>

        {/* Location FAB */}
        <View className="absolute bottom-6 right-4">
          <TouchableOpacity
            className="w-12 h-12 rounded-xl bg-white border border-zinc-200 items-center justify-center"
            onPress={centerOnUser}
          >
            {locationLoading
              ? <ActivityIndicator color="#4f46e5" size="small" />
              : <Text className="text-xl">🎯</Text>
            }
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <EventDetailSheet event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </View>
  );
}

