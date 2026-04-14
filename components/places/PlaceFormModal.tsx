import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, MapPressEvent, Region } from 'react-native-maps';
import { SavedPlace } from '../../types';
import { Input } from '../ui/Input';

const RADIUS_OPTIONS = [200, 500, 1000, 2000, 5000];

interface PlaceFormModalProps {
  visible: boolean;
  initialPlace?: SavedPlace | null;
  initialRegion?: Region;
  onSave: (data: { name: string; lat: number; lng: number; radius_meters: number }) => Promise<void>;
  onClose: () => void;
}

export function PlaceFormModal({ visible, initialPlace, initialRegion, onSave, onClose }: PlaceFormModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radius, setRadius] = useState(500);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const defaultRegion: Region = initialRegion ?? {
    latitude: -34.6083, longitude: -58.3712, latitudeDelta: 0.05, longitudeDelta: 0.05,
  };

  useEffect(() => {
    if (initialPlace) {
      setName(initialPlace.name);
      setLat(initialPlace.lat);
      setLng(initialPlace.lng);
      setRadius(initialPlace.radius_meters);
    } else {
      setName(''); setLat(null); setLng(null); setRadius(500);
    }
    setError('');
  }, [initialPlace, visible]);

  async function handleSave() {
    if (!name.trim()) { setError('Ingresá un nombre'); return; }
    if (lat == null || lng == null) { setError('Tocá el mapa para marcar la ubicación'); return; }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), lat, lng, radius_meters: radius });
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
        <View
          className="flex-row items-center justify-between px-5 bg-white border-b border-zinc-200"
          style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
        >
          <TouchableOpacity onPress={onClose}>
            <Text className="text-zinc-500 text-base">Cancelar</Text>
          </TouchableOpacity>
          <Text className="text-base font-bold text-zinc-900">
            {initialPlace ? 'Editar lugar' : 'Nuevo lugar'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#4f46e5" size="small" />
              : <Text className="text-indigo-600 font-bold text-base">Guardar</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }}>
          <Input label="Nombre" value={name} onChangeText={setName}
            placeholder="Ej: Casa, Trabajo, Gimnasio..." />

          <View className="gap-1.5">
            <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Ubicación</Text>
            <View className="rounded-xl overflow-hidden" style={{ height: 260 }}>
              <MapView
                style={{ flex: 1 }}
                initialRegion={lat && lng
                  ? { latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }
                  : defaultRegion
                }
                onPress={(e: MapPressEvent) => {
                  setLat(e.nativeEvent.coordinate.latitude);
                  setLng(e.nativeEvent.coordinate.longitude);
                }}
              >
                {lat != null && lng != null && (
                  <>
                    <Marker coordinate={{ latitude: lat, longitude: lng }} />
                    <Circle
                      center={{ latitude: lat, longitude: lng }}
                      radius={radius}
                      fillColor="rgba(79,70,229,0.12)"
                      strokeColor="#4f46e5"
                      strokeWidth={2}
                    />
                  </>
                )}
              </MapView>
            </View>
            {lat != null && (
              <Text className="text-xs text-zinc-400 text-center">
                {lat.toFixed(5)}, {lng?.toFixed(5)}
              </Text>
            )}
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Radio de alerta</Text>
            <View className="flex-row flex-wrap gap-2">
              {RADIUS_OPTIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRadius(r)}
                  className={`px-4 py-2.5 rounded-xl border ${
                    radius === r ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-zinc-300'
                  }`}
                >
                  <Text className={`text-sm font-semibold ${radius === r ? 'text-white' : 'text-zinc-600'}`}>
                    {r < 1000 ? `${r}m` : `${r / 1000}km`}
                  </Text>
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
