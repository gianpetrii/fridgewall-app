import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
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
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);

  const results = useMemo(() => {
    let list = filter === 'all' ? events : events.filter((e) => e.category === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        e.title.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (!coords) return 0;
      return (
        getDistanceMeters(coords.latitude, coords.longitude, a.lat, a.lng) -
        getDistanceMeters(coords.latitude, coords.longitude, b.lat, b.lng)
      );
    });
  }, [events, filter, search, coords]);

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <Container>
        <View className="px-5 pt-6 pb-3 flex-row items-baseline justify-between">
          <Text className="text-2xl font-bold text-zinc-900">Eventos</Text>
          <Text className="text-sm text-zinc-400">{results.length} activos</Text>
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32 }}
          ListHeaderComponent={
            <View className="gap-3 px-5 pb-3">
              {/* Buscador */}
              <View className="flex-row items-center bg-white border border-zinc-300 rounded-xl px-4 gap-3">
                <Feather name="search" size={16} color="#a1a1aa" />
                <TextInput
                  className="flex-1 text-base text-zinc-900"
                  style={{ paddingVertical: 12, includeFontPadding: false } as any}
                  placeholder="Buscar por evento o lugar..."
                  placeholderTextColor="#a1a1aa"
                  value={search}
                  onChangeText={setSearch}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Feather name="x" size={16} color="#a1a1aa" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Filtros de categoría */}
              <View className="flex-row flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => setFilter(f.key)}
                    className={`px-3.5 py-1.5 rounded-xl border ${
                      filter === f.key ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-zinc-300'
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${filter === f.key ? 'text-white' : 'text-zinc-600'}`}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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
              <Feather name="search" size={32} color="#d4d4d8" />
              <Text className="text-zinc-400 text-base">
                {search ? `Sin resultados para "${search}"` : 'Sin eventos en esta categoría'}
              </Text>
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text className="text-indigo-600 text-sm font-semibold">Limpiar búsqueda</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      </Container>
      <EventDetailSheet event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </SafeAreaView>
  );
}
