import React, { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvents } from '../../hooks/useEvents';
import { useLocation } from '../../hooks/useLocation';
import { useEventFilters } from '../../hooks/useEventFilters';
import { EventCard } from '../../components/events/EventCard';
import { EventDetailSheet } from '../../components/events/EventDetailSheet';
import { FilterPanel } from '../../components/events/FilterPanel';
import { Container } from '../../components/layout/Container';
import { AppEvent } from '../../types';
import { getDistanceMeters } from '../../lib/mockEvents';
import { Feather } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

export default function EventsScreen() {
  const { events } = useEvents();
  const { coords } = useLocation();
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);

  const {
    search, setSearch,
    categoryFilter, setCategoryFilter,
    selectedDate, setSelectedDate,
    dateOptions,
    filteredEvents,
    hasActiveFilters,
    clearFilters,
  } = useEventFilters(events);

  const sorted = [...filteredEvents].sort((a, b) => {
    if (!coords) return 0;
    return (
      getDistanceMeters(coords.latitude, coords.longitude, a.lat, a.lng) -
      getDistanceMeters(coords.latitude, coords.longitude, b.lat, b.lng)
    );
  });

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <Container>
        <View className="px-5 pt-6 pb-3 flex-row items-baseline justify-between">
          <Text className="text-2xl font-bold text-zinc-900">Eventos</Text>
          <Text className="text-sm text-zinc-400">{filteredEvents.length} activos</Text>
        </View>

        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32 }}
          ListHeaderComponent={
            <FilterPanel
              variant="inline"
              search={search} onSearchChange={setSearch}
              categoryFilter={categoryFilter} onCategoryChange={setCategoryFilter}
              selectedDate={selectedDate} onDateChange={setSelectedDate}
              dateOptions={dateOptions}
              hasActiveFilters={hasActiveFilters} onClear={clearFilters}
            />
          }
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onPress={setSelectedEvent}
              distance={coords ? getDistanceMeters(coords.latitude, coords.longitude, item.lat, item.lng) : undefined}
            />
          )}
          ListEmptyComponent={
            <View className="items-center py-20 gap-3">
              <Feather name="search" size={32} color="#d4d4d8" />
              <Text className="text-zinc-400 text-base">
                {search ? `Sin resultados para "${search}"` : 'Sin eventos para esta selección'}
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity onPress={clearFilters}>
                  <Text className="text-indigo-600 text-sm font-semibold">Limpiar filtros</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </Container>
      <EventDetailSheet event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </SafeAreaView>
  );
}
