import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { AppEvent } from '../../types';

const CATEGORY_LABELS: Record<AppEvent['category'], string> = {
  concert: 'Recital', sports: 'Deporte', festival: 'Festival', march: 'Marcha', other: 'Otro',
};

const CATEGORY_COLORS: Record<AppEvent['category'], string> = {
  concert: '#4f46e5', sports: '#0891b2', festival: '#d97706', march: '#dc2626', other: '#6b7280',
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  event: AppEvent | null;
  onClose: () => void;
}

export function EventDetailSheet({ event, onClose }: Props) {
  if (!event) return null;
  const color = CATEGORY_COLORS[event.category];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/30" activeOpacity={1} onPress={onClose} />
      <View className="bg-white rounded-t-2xl" style={{ maxHeight: '75%' }}>
        <View className="items-center pt-3 pb-1">
          <View className="w-10 h-1 rounded-full bg-zinc-300" />
        </View>
        <ScrollView bounces={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

          <View style={{ backgroundColor: color + '15', borderRadius: 10, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 }}>
            <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{CATEGORY_LABELS[event.category]}</Text>
          </View>

          <Text className="text-2xl font-bold text-zinc-900 leading-tight mb-1">{event.title}</Text>
          <Text className="text-base text-zinc-500 mb-5">{event.venue}</Text>

          <View className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 gap-3 mb-5">
            <InfoRow icon="🕐" label="Inicio" value={formatDateTime(event.starts_at)} />
            <View className="h-px bg-zinc-200" />
            <InfoRow icon="🕐" label="Fin" value={formatDateTime(event.ends_at)} />
            <View className="h-px bg-zinc-200" />
            <InfoRow icon="📍" label="Radio de impacto" value={`${event.radius_meters} metros`} />
          </View>

          {event.description ? (
            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Descripción</Text>
              <Text className="text-base text-zinc-700 leading-relaxed">{event.description}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-base">{icon}</Text>
      <Text className="text-sm text-zinc-500 w-20">{label}</Text>
      <Text className="text-sm font-semibold text-zinc-800 flex-1">{value}</Text>
    </View>
  );
}
