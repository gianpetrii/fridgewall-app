import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Platform, Share, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import { AppEvent, EVENT_SIZE_LABELS, EVENT_SIZE_ATTENDANCE } from '../../types';

const CATEGORY_LABELS: Record<AppEvent['category'], string> = {
  concert: 'Recital', sports: 'Deporte', festival: 'Festival', march: 'Marcha', other: 'Otro',
};

const ACCENT = '#4f46e5';

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

async function handleShare(event: AppEvent) {
  const start = new Date(event.starts_at).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
  await Share.share({
    title: event.title,
    message: `📍 ${event.title}\n🏟 ${event.venue}\n🕐 ${start}\n\nCompartido desde HappeningNow`,
  });
}

async function handleAddToCalendar(event: AppEvent) {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Sin permisos', 'Habilitá el acceso al calendario en Configuración.');
    return;
  }
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const defaultCal = calendars.find((c) => c.allowsModifications) ?? calendars[0];
  if (!defaultCal) { Alert.alert('Error', 'No se encontró un calendario disponible.'); return; }
  await Calendar.createEventAsync(defaultCal.id, {
    title: event.title,
    location: event.venue,
    startDate: new Date(event.starts_at),
    endDate: new Date(event.ends_at),
    notes: event.description ?? '',
    alarms: [{ relativeOffset: -60 }],
  });
  Alert.alert('Guardado', `"${event.title}" fue agregado a tu calendario.`);
}

export function EventDetailSheet({ event, onClose }: Props) {
  if (!event) return null;
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
            <View style={{ backgroundColor: ACCENT + '12', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '700' }}>{CATEGORY_LABELS[event.category]}</Text>
            </View>
            <View style={{ backgroundColor: '#f4f4f5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: '#52525b', fontSize: 12, fontWeight: '700' }}>
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

          {/* Acciones */}
          <View className="flex-row gap-3 mb-5">
            <TouchableOpacity
              onPress={() => handleShare(event)}
              className="flex-1 flex-row items-center justify-center gap-2 bg-white border border-zinc-300 rounded-xl py-3"
            >
              <Feather name="share" size={16} color="#52525b" />
              <Text className="text-sm font-semibold text-zinc-700">Compartir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleAddToCalendar(event)}
              className="flex-1 flex-row items-center justify-center gap-2 bg-indigo-600 rounded-xl py-3"
            >
              <Feather name="calendar" size={16} color="#fff" />
              <Text className="text-sm font-semibold text-white">Al calendario</Text>
            </TouchableOpacity>
          </View>

          {/* Mapa — solo en native */}
          {Platform.OS !== 'web' && <EventMap event={event} color={ACCENT} />}

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
