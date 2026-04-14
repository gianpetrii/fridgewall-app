import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { AppEvent, EVENT_SIZE_LABELS, EVENT_SIZE_ATTENDANCE } from '../../types';

const CATEGORY_LABELS: Record<AppEvent['category'], string> = {
  concert: 'Recital', sports: 'Deporte', festival: 'Festival', march: 'Marcha', other: 'Otro',
};

const CATEGORY_COLORS: Record<AppEvent['category'], string> = {
  concert: '#4f46e5', sports: '#0891b2', festival: '#d97706', march: '#dc2626', other: '#6b7280',
};

const SIZE_COLORS: Record<AppEvent['size'], string> = {
  small: '#10b981',
  medium: '#f59e0b',
  large: '#ef4444',
  massive: '#7c3aed',
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatRadius(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

interface Props {
  event: AppEvent | null;
  onClose: () => void;
}

export function EventDetailSheet({ event, onClose }: Props) {
  if (!event) return null;
  const color = CATEGORY_COLORS[event.category];
  const sizeColor = SIZE_COLORS[event.size];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/30" activeOpacity={1} onPress={onClose} />
      <View className="bg-white rounded-t-2xl" style={{ maxHeight: '80%' }}>
        <View className="items-center pt-3 pb-1">
          <View className="w-10 h-1 rounded-full bg-zinc-300" />
        </View>
        <ScrollView bounces={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

          {/* Badges */}
          <View className="flex-row gap-2 mb-3 flex-wrap">
            <View style={{ backgroundColor: color + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{CATEGORY_LABELS[event.category]}</Text>
            </View>
            <View style={{ backgroundColor: sizeColor + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: sizeColor, fontSize: 12, fontWeight: '700' }}>
                {EVENT_SIZE_LABELS[event.size]} · {EVENT_SIZE_ATTENDANCE[event.size]}
              </Text>
            </View>
          </View>

          <Text className="text-2xl font-bold text-zinc-900 leading-tight mb-1">{event.title}</Text>
          <Text className="text-base text-zinc-500 mb-5">{event.venue}</Text>

          {/* Info rows */}
          <View className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 gap-3 mb-5">
            <InfoRow icon="🕐" label="Inicio" value={formatDateTime(event.starts_at)} />
            <View className="h-px bg-zinc-200" />
            <InfoRow icon="🕐" label="Fin" value={formatDateTime(event.ends_at)} />
            <View className="h-px bg-zinc-200" />
            <InfoRow icon="📍" label="Radio de impacto" value={formatRadius(event.radius_meters)} />
          </View>

          {/* Mapa — solo en native */}
          {Platform.OS !== 'web' && <EventMap event={event} color={color} />}

          {/* Descripción */}
          {event.description ? (
            <View className="gap-1.5 mt-1">
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
      <Text className="text-sm text-zinc-500 w-24">{label}</Text>
      <Text className="text-sm font-semibold text-zinc-800 flex-1">{value}</Text>
    </View>
  );
}

// Componente separado para el mapa (cargado dinámicamente solo en native)
function EventMap({ event, color }: { event: AppEvent; color: string }) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { default: MapView, Circle, Marker } = require('react-native-maps');
  return (
    <View className="gap-1.5 mb-5">
      <Text className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Zona de impacto</Text>
      <View className="rounded-xl overflow-hidden" style={{ height: 200 }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: event.lat,
            longitude: event.lng,
            latitudeDelta: (event.radius_meters / 111000) * 4,
            longitudeDelta: (event.radius_meters / 111000) * 4,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
        >
          <Marker coordinate={{ latitude: event.lat, longitude: event.lng }} />
          <Circle
            center={{ latitude: event.lat, longitude: event.lng }}
            radius={event.radius_meters}
            fillColor={color + '20'}
            strokeColor={color}
            strokeWidth={2}
          />
        </MapView>
      </View>
      <Text className="text-xs text-zinc-400 text-center">
        Radio de impacto estimado: {formatRadius(event.radius_meters)}
      </Text>
    </View>
  );
}
