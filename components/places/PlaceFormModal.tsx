import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity,
  Modal, ScrollView, ActivityIndicator, FlatList,
  TextInput, Keyboard,
} from 'react-native';
import MapView, { Marker, Circle, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SavedPlace } from '../../types';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const RADIUS_OPTIONS = [200, 500, 1000, 2000, 5000];
const HOURS_OPTIONS = [6, 12, 24, 48];

interface Suggestion {
  place_id: string;
  description: string;
}

interface PlaceFormModalProps {
  visible: boolean;
  initialPlace?: SavedPlace | null;
  initialRegion?: Region;
  onSave: (data: { name: string; lat: number; lng: number; radius_meters: number; notify_hours_before: number }) => Promise<void>;
  onClose: () => void;
}

export function PlaceFormModal({ visible, initialPlace, initialRegion, onSave, onClose }: PlaceFormModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [radius, setRadius] = useState(500);
  const [notifyHours, setNotifyHours] = useState(24);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const mapRef = useRef<MapView>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const defaultRegion: Region = initialRegion ?? {
    latitude: -34.6083, longitude: -58.3712, latitudeDelta: 0.05, longitudeDelta: 0.05,
  };

  useEffect(() => {
    if (initialPlace) {
      setName(initialPlace.name);
      setLat(initialPlace.lat);
      setLng(initialPlace.lng);
      setRadius(initialPlace.radius_meters);
      setNotifyHours((initialPlace as any).notify_hours_before ?? 24);
      setSelectedAddress('');
      setSearchQuery('');
    } else {
      setName(''); setLat(null); setLng(null); setRadius(500);
      setNotifyHours(24); setSelectedAddress(''); setSearchQuery('');
    }
    setSuggestions([]);
    setError('');
  }, [initialPlace, visible]);

  function handleSearchChange(text: string) {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (text.length < 3) { setSuggestions([]); return; }
    searchTimeout.current = setTimeout(() => fetchSuggestions(text), 400);
  }

  async function fetchSuggestions(query: string) {
    if (!GOOGLE_API_KEY) return;
    setSearching(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&language=es`;
      const res = await fetch(url);
      const data = await res.json();
      setSuggestions(data.predictions ?? []);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleSelectSuggestion(suggestion: Suggestion) {
    Keyboard.dismiss();
    setSuggestions([]);
    setSearchQuery('');
    setSelectedAddress(suggestion.description);
    if (!name) setName(suggestion.description.split(',')[0]);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.place_id}&fields=geometry&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      const loc = data.result?.geometry?.location;
      if (loc) {
        setLat(loc.lat);
        setLng(loc.lng);
        setTimeout(() => {
          mapRef.current?.animateToRegion({
            latitude: loc.lat, longitude: loc.lng,
            latitudeDelta: 0.02, longitudeDelta: 0.02,
          }, 400);
        }, 100);
      }
    } catch {
      setError('No se pudo obtener la ubicación.');
    }
  }

  async function handleSave() {
    if (!name.trim()) { setError('Ingresá un nombre'); return; }
    if (lat == null || lng == null) { setError('Buscá y seleccioná una ubicación'); return; }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), lat, lng, radius_meters: radius, notify_hours_before: notifyHours });
      onClose();
    } catch {
      setError('Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-zinc-50">
        {/* Header con safe area */}
        <View
          className="flex-row items-center justify-between px-5 bg-white border-b border-zinc-200"
          style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
        >
          <TouchableOpacity onPress={onClose}>
            <Text className="text-zinc-500 text-base">Cancelar</Text>
          </TouchableOpacity>
          <Text className="text-base font-bold text-zinc-900">
            {initialPlace ? 'Editar ubicación' : 'Nueva ubicación'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#4f46e5" size="small" />
              : <Text className="text-indigo-600 font-bold text-base">Guardar</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 32 }}
        >
          {/* Nombre */}
          <View className="gap-1.5">
            <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Nombre</Text>
            <TextInput
              className="bg-white border border-zinc-300 rounded-xl px-4 text-base text-zinc-900"
              style={{ paddingVertical: 14, lineHeight: 20, includeFontPadding: false } as any}
              value={name}
              onChangeText={setName}
              placeholder="Ej: Casa, Trabajo, Gimnasio..."
              placeholderTextColor="#a1a1aa"
            />
          </View>

          {/* Búsqueda */}
          <View className="gap-1.5">
            <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Buscar ubicación</Text>
            <View className="relative">
              <TextInput
                className="bg-white border border-zinc-300 rounded-xl px-4 text-base text-zinc-900"
                style={{ paddingVertical: 14, lineHeight: 20, includeFontPadding: false } as any}
                value={searchQuery}
                onChangeText={handleSearchChange}
                placeholder="Escribí una dirección o lugar..."
                placeholderTextColor="#a1a1aa"
                returnKeyType="search"
              />
              {searching && (
                <View className="absolute right-4 top-4">
                  <ActivityIndicator color="#4f46e5" size="small" />
                </View>
              )}
            </View>

            {suggestions.length > 0 && (
              <View className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                {suggestions.map((s, i) => (
                  <TouchableOpacity
                    key={s.place_id}
                    onPress={() => handleSelectSuggestion(s)}
                    className={`px-4 py-3 ${i < suggestions.length - 1 ? 'border-b border-zinc-100' : ''}`}
                  >
                    <Text className="text-sm text-zinc-800" numberOfLines={2}>{s.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {selectedAddress ? (
              <View className="flex-row items-center gap-2 px-1">
                <Text className="text-xs text-indigo-600">📍</Text>
                <Text className="text-xs text-zinc-500 flex-1" numberOfLines={1}>{selectedAddress}</Text>
              </View>
            ) : null}
          </View>

          {/* Mapa */}
          {lat != null && lng != null && (
            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Mapa</Text>
              <View className="rounded-xl overflow-hidden" style={{ height: 200 }}>
                <MapView
                  ref={mapRef}
                  style={{ flex: 1 }}
                  initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
                >
                  <Marker coordinate={{ latitude: lat, longitude: lng }} />
                  <Circle
                    center={{ latitude: lat, longitude: lng }}
                    radius={radius}
                    fillColor="rgba(79,70,229,0.12)"
                    strokeColor="#4f46e5"
                    strokeWidth={2}
                  />
                </MapView>
              </View>
            </View>
          )}

          {/* Radio */}
          <View className="gap-2">
            <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Radio de alerta</Text>
            <View className="flex-row flex-wrap gap-2">
              {RADIUS_OPTIONS.map((r) => (
                <TouchableOpacity
                  key={r} onPress={() => setRadius(r)}
                  className={`px-4 py-2.5 rounded-xl border ${radius === r ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-zinc-300'}`}
                >
                  <Text className={`text-sm font-semibold ${radius === r ? 'text-white' : 'text-zinc-600'}`}>
                    {r < 1000 ? `${r}m` : `${r / 1000}km`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Anticipación */}
          <View className="gap-2">
            <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Anticipación de alerta</Text>
            <Text className="text-xs text-zinc-400">Notificarme con anticipación de</Text>
            <View className="flex-row gap-2">
              {HOURS_OPTIONS.map((h) => (
                <TouchableOpacity
                  key={h} onPress={() => setNotifyHours(h)}
                  className={`flex-1 py-2.5 rounded-xl items-center border ${notifyHours === h ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-zinc-300'}`}
                >
                  <Text className={`text-sm font-bold ${notifyHours === h ? 'text-white' : 'text-zinc-600'}`}>{h}h</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3">
              <Text className="text-red-600 text-sm text-center">{error}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
