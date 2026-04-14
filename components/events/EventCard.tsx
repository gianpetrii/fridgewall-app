import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AppEvent } from '../../types';

const CATEGORY_LABELS: Record<AppEvent['category'], string> = {
  concert: 'Recital', sports: 'Deporte', festival: 'Festival', march: 'Marcha', other: 'Otro',
};

const ACCENT = '#4f46e5';

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

interface EventCardProps {
  event: AppEvent;
  onPress: (event: AppEvent) => void;
  distance?: number;
  compact?: boolean;
}

export function EventCard({ event, onPress, distance, compact }: EventCardProps) {
  return (
    <TouchableOpacity
      onPress={() => onPress(event)}
      activeOpacity={0.8}
      className="mx-5 mb-3 bg-white border border-zinc-200 rounded-xl overflow-hidden"
    >
      <View style={{ width: 3, position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: ACCENT }} />
      <View className="pl-4 pr-4 py-3.5 ml-1">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="text-base font-bold text-zinc-900 flex-1 leading-snug" numberOfLines={2}>
            {event.title}
          </Text>
          {distance !== undefined && (
            <View className="bg-zinc-100 rounded-xl px-2.5 py-1">
              <Text className="text-xs font-semibold text-zinc-500">{formatDistance(distance)}</Text>
            </View>
          )}
        </View>
        <Text className="text-sm text-zinc-500 mt-1" numberOfLines={1}>{event.venue}</Text>
        <View className="flex-row items-center gap-2 mt-2.5">
          <View style={{ backgroundColor: ACCENT + '12', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: ACCENT, fontSize: 11, fontWeight: '700' }}>{CATEGORY_LABELS[event.category]}</Text>
          </View>
          <Text className="text-xs text-zinc-400">
            {formatTime(event.starts_at)} – {formatTime(event.ends_at)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
