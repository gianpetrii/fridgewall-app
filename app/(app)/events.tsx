import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvents } from '../../hooks/useEvents';
import { useLocation } from '../../hooks/useLocation';
import { EventCard } from '../../components/events/EventCard';
import { EventDetailSheet } from '../../components/events/EventDetailSheet';
import { Container } from '../../components/layout/Container';
import { AppEvent } from '../../types';
import { getDistanceMeters } from '../../lib/mockEvents';

type FilterCategory = 'all' | AppEvent['category'];

const FILTERS: { key: FilterCategory; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'concert', label: 'Recitales' },
  { key: 'sports', label: 'Deporte' },
  { key: 'festival', label: 'Festivales' },
  { key: 'march', label: 'Marchas' },
  { key: 'other', label: 'Otros' },
];

export default function EventsScreen() {
  const { events } = useEvents();
  const { coords } = useLocation();
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);

  const filtered = filter === 'all' ? events : events.filter((e) => e.category === filter);
  const sorted = [...filtered].sort((a, b) => {
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
          <Text className="text-sm text-zinc-400">{filtered.length} activos</Text>
        </View>

        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListHeaderComponent={
            <View className="flex-row flex-wrap gap-2 px-5 pb-3">
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  className={`px-3.5 py-1.5 rounded-xl border ${
                    filter === f.key
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'bg-white border-zinc-300'
                  }`}
                >
                  <Text className={`text-sm font-semibold ${filter === f.key ? 'text-white' : 'text-zinc-600'}`}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
              <Text className="text-zinc-300 text-4xl">—</Text>
              <Text className="text-zinc-400 text-base">Sin eventos en esta categoría</Text>
            </View>
          }
        />
      </Container>
      <EventDetailSheet event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </SafeAreaView>
  );
}
