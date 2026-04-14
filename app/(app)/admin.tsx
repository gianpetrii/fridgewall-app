import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useEventsStore } from '../../store/useEventsStore';
import { AppEvent, EventCategory, EventSize, EVENT_SIZE_RADIUS } from '../../types';
import { router } from 'expo-router';

// UID del admin — reemplazá con tu user id de Supabase
const ADMIN_UID = process.env.EXPO_PUBLIC_ADMIN_UID ?? '';

const CATEGORIES: EventCategory[] = ['concert', 'sports', 'festival', 'march', 'other'];
const CATEGORY_LABELS: Record<EventCategory, string> = {
  concert: 'Recital', sports: 'Deporte', festival: 'Festival', march: 'Marcha', other: 'Otro',
};
const SIZES: EventSize[] = ['small', 'medium', 'large', 'massive'];
const SIZE_LABELS: Record<EventSize, string> = {
  small: 'Pequeño', medium: 'Mediano', large: 'Grande', massive: 'Masivo',
};

interface EventForm {
  title: string;
  category: EventCategory;
  size: EventSize;
  lat: string;
  lng: string;
  venue: string;
  address: string;
  description: string;
  ticket_url: string;
  starts_at: string;
  ends_at: string;
}

const EMPTY_FORM: EventForm = {
  title: '', category: 'concert', size: 'medium',
  lat: '', lng: '', venue: '', address: '', description: '', ticket_url: '',
  starts_at: '', ends_at: '',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminScreen() {
  const { user } = useAuthStore();
  const { events, fetchEvents } = useEventsStore();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);

  // Redirigir si no es admin
  useEffect(() => {
    if (user && ADMIN_UID && user.id !== ADMIN_UID) {
      router.replace('/(app)');
    }
  }, [user]);

  useEffect(() => { fetchEvents(); }, []);

  function openNew() {
    setEditingEvent(null);
    const now = new Date();
    const later = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    setForm({
      ...EMPTY_FORM,
      starts_at: now.toISOString().slice(0, 16),
      ends_at: later.toISOString().slice(0, 16),
    });
    setModalVisible(true);
  }

  function openEdit(event: AppEvent) {
    setEditingEvent(event);
    setForm({
      title: event.title,
      category: event.category,
      size: event.size,
      lat: String(event.lat),
      lng: String(event.lng),
      venue: event.venue,
      address: event.address ?? '',
      description: event.description ?? '',
      ticket_url: event.ticket_url ?? '',
      starts_at: new Date(event.starts_at).toISOString().slice(0, 16),
      ends_at: new Date(event.ends_at).toISOString().slice(0, 16),
    });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!form.title || !form.lat || !form.lng || !form.venue || !form.starts_at || !form.ends_at) {
      Alert.alert('Campos requeridos', 'Completá título, coordenadas, venue y fechas.');
      return;
    }
    const latNum = parseFloat(form.lat), lngNum = parseFloat(form.lng);
    if (isNaN(latNum) || isNaN(lngNum)) { Alert.alert('Error', 'Coordenadas inválidas'); return; }

    setLoading(true);
    const payload = {
      title: form.title, category: form.category, size: form.size,
      lat: latNum, lng: lngNum,
      radius_meters: EVENT_SIZE_RADIUS[form.size],
      venue: form.venue, address: form.address || null,
      description: form.description || null,
      ticket_url: form.ticket_url || null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      source: 'manual',
    };

    const { error } = editingEvent
      ? await supabase.from('events').update(payload).eq('id', editingEvent.id)
      : await supabase.from('events').insert({ ...payload, external_id: `manual-${Date.now()}` });

    setLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setModalVisible(false);
    fetchEvents();
  }

  async function handleDelete(id: string) {
    Alert.alert('Eliminar evento', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await supabase.from('events').update({ active: false }).eq('id', id);
          fetchEvents();
        },
      },
    ]);
  }

  const F = (field: keyof EventForm) => ({
    value: form[field] as string,
    onChangeText: (v: string) => setForm((p) => ({ ...p, [field]: v })),
  });

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between border-b border-zinc-200 bg-white">
        <Text className="text-xl font-bold text-zinc-900">Admin · Eventos</Text>
        <TouchableOpacity onPress={openNew} className="flex-row items-center gap-1.5 bg-indigo-600 px-4 py-2 rounded-xl">
          <Feather name="plus" size={16} color="#fff" />
          <Text className="text-white text-sm font-semibold">Nuevo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View className="bg-white border border-zinc-200 rounded-xl px-4 py-3 gap-1">
            <View className="flex-row items-start justify-between">
              <Text className="text-base font-semibold text-zinc-900 flex-1 pr-3" numberOfLines={2}>{item.title}</Text>
              <View className="flex-row gap-2">
                <TouchableOpacity onPress={() => openEdit(item)}>
                  <Feather name="edit-2" size={16} color="#6366f1" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Feather name="trash-2" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
            <Text className="text-xs text-zinc-500">{item.venue}</Text>
            <View className="flex-row gap-2 mt-1">
              <View className="bg-indigo-50 px-2 py-0.5 rounded-lg">
                <Text className="text-xs font-semibold text-indigo-600">{CATEGORY_LABELS[item.category]}</Text>
              </View>
              <View className="bg-zinc-100 px-2 py-0.5 rounded-lg">
                <Text className="text-xs font-semibold text-zinc-500">{SIZE_LABELS[item.size]}</Text>
              </View>
              <Text className="text-xs text-zinc-400">{formatDate(item.starts_at)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Text className="text-zinc-400">Sin eventos. Creá el primero.</Text>
          </View>
        }
      />

      {/* Modal de formulario */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 bg-zinc-50">
          <View
            className="flex-row items-center justify-between px-5 bg-white border-b border-zinc-200"
            style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
          >
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text className="text-zinc-500">Cancelar</Text>
            </TouchableOpacity>
            <Text className="font-bold text-zinc-900">{editingEvent ? 'Editar evento' : 'Nuevo evento'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator color="#4f46e5" size="small" />
                : <Text className="text-indigo-600 font-bold">Guardar</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: insets.bottom + 40 }}>
            <Field label="Título" {...F('title')} placeholder="Ej: Recital de Coldplay" />
            <Field label="Venue" {...F('venue')} placeholder="Ej: Estadio Monumental" />
            <Field label="Dirección" {...F('address')} placeholder="Ej: Av. Figueroa Alcorta 7597" />

            <View className="flex-row gap-3">
              <View className="flex-1"><Field label="Latitud" {...F('lat')} placeholder="-34.5447" keyboardType="numeric" /></View>
              <View className="flex-1"><Field label="Longitud" {...F('lng')} placeholder="-58.4512" keyboardType="numeric" /></View>
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Categoría</Text>
              <View className="flex-row flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setForm((p) => ({ ...p, category: c }))}
                    className={`px-3 py-2 rounded-xl border ${form.category === c ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-zinc-300'}`}>
                    <Text className={`text-xs font-semibold ${form.category === c ? 'text-white' : 'text-zinc-600'}`}>{CATEGORY_LABELS[c]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Tamaño estimado</Text>
              <View className="flex-row flex-wrap gap-2">
                {SIZES.map((s) => (
                  <TouchableOpacity key={s} onPress={() => setForm((p) => ({ ...p, size: s }))}
                    className={`px-3 py-2 rounded-xl border ${form.size === s ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-zinc-300'}`}>
                    <Text className={`text-xs font-semibold ${form.size === s ? 'text-white' : 'text-zinc-600'}`}>{SIZE_LABELS[s]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text className="text-xs text-zinc-400">Radio automático: {EVENT_SIZE_RADIUS[form.size]}m</Text>
            </View>

            <Field label="Inicio (YYYY-MM-DDTHH:MM)" {...F('starts_at')} placeholder="2026-04-14T20:00" />
            <Field label="Fin (YYYY-MM-DDTHH:MM)" {...F('ends_at')} placeholder="2026-04-14T23:30" />
            <Field label="Descripción" {...F('description')} placeholder="Descripción del impacto..." multiline />
            <Field label="Link de entradas (opcional)" {...F('ticket_url')} placeholder="https://..." keyboardType="url" />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, multiline, ...props }: { label: string; multiline?: boolean } & any) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">{label}</Text>
      <TextInput
        className="bg-white border border-zinc-300 rounded-xl px-4 text-base text-zinc-900"
        style={{ paddingVertical: 12, lineHeight: 20, includeFontPadding: false, ...(multiline ? { minHeight: 80, textAlignVertical: 'top' } : {}) } as any}
        placeholderTextColor="#a1a1aa"
        multiline={multiline}
        {...props}
      />
    </View>
  );
}
