import React, { useState, useRef } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Region } from 'react-native-maps';
import { useLocation } from '../../hooks/useLocation';
import { useEvents } from '../../hooks/useEvents';
import { useEventFilters } from '../../hooks/useEventFilters';
import { EventMarker } from '../../components/map/EventMarker';
import { EventDetailSheet } from '../../components/events/EventDetailSheet';
import { FilterPanel } from '../../components/events/FilterPanel';
import { AppEvent } from '../../types';

const BUENOS_AIRES: Region = {
  latitude: -34.6083, longitude: -58.3712,
  latitudeDelta: 0.15, longitudeDelta: 0.15,
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const { coords } = useLocation();
  const { events } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const {
    search, setSearch,
    categoryFilter, setCategoryFilter,
    selectedDate, setSelectedDate,
    dateOptions,
    filteredEvents,
    hasActiveFilters,
    clearFilters,
  } = useEventFilters(events);

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
        compassOffset={{ x: -8, y: 110 }}
        onMapReady={() => setMapReady(true)}
        onPress={() => showFilters && setShowFilters(false)}
      >
        {mapReady && filteredEvents.map((event) => (
          <EventMarker key={event.id} event={event} onPress={setSelectedEvent} />
        ))}
      </MapView>

      {/* UI flotante */}
      <SafeAreaView className="absolute inset-x-0 top-0" pointerEvents="box-none">
        <View className="px-4 pt-2 gap-2" pointerEvents="box-none">
          <FilterPanel
            variant="floating"
            search={search} onSearchChange={setSearch}
            categoryFilter={categoryFilter} onCategoryChange={setCategoryFilter}
            selectedDate={selectedDate} onDateChange={setSelectedDate}
            dateOptions={dateOptions}
            hasActiveFilters={hasActiveFilters} onClear={clearFilters}
            showFilters={showFilters} onToggleFilters={() => setShowFilters(!showFilters)}
          />

          {hasActiveFilters && !showFilters && (
            <View className="self-start bg-white/95 border border-zinc-200 rounded-xl px-3 py-1.5">
              <Text className="text-xs font-semibold text-zinc-600">
                {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      <EventDetailSheet event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </View>
  );
}
