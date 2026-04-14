import React, { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvents } from '../../hooks/useEvents';
import { EventCard } from '../../components/events/EventCard';
import { EventDetailSheet } from '../../components/events/EventDetailSheet';
import { Container } from '../../components/layout/Container';
import { Logo } from '../../components/ui/Logo';
import { AppEvent } from '../../types';

export default function MapScreenWeb() {
  const { events } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <Container>
        <View className="px-5 pt-6 pb-3 flex-row items-center gap-3">
          <Logo size="sm" />
          <View>
            <Text className="text-xl font-bold text-zinc-900">HappeningNow</Text>
            <Text className="text-xs text-zinc-400">Vista web · mapa disponible en mobile</Text>
          </View>
        </View>

        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32, paddingTop: 4 }}
          renderItem={({ item }) => (
            <EventCard event={item} onPress={setSelectedEvent} />
          )}
          ListEmptyComponent={
            <View className="items-center py-20 gap-3">
              <Text className="text-zinc-400 text-base">Sin eventos activos</Text>
            </View>
          }
        />
      </Container>

      <EventDetailSheet event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </SafeAreaView>
  );
}
