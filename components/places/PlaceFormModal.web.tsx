import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SavedPlace } from '../../types';
import { Input } from '../ui/Input';

const RADIUS_OPTIONS = [200, 500, 1000, 2000, 5000];

interface PlaceFormModalProps {
  visible: boolean;
  initialPlace?: SavedPlace | null;
  initialRegion?: unknown;
  onSave: (data: { name: string; lat: number; lng: number; radius_meters: number }) => Promise<void>;
  onClose: () => void;
}

export function PlaceFormModal({ visible, initialPlace, onSave, onClose }: PlaceFormModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState(500);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialPlace) {
      setName(initialPlace.name);
      setLat(String(initialPlace.lat));
      setLng(String(initialPlace.lng));
      setRadius(initialPlace.radius_meters);
    } else {
      setName(''); setLat(''); setLng(''); setRadius(500);
    }
    setError('');
  }, [initialPlace, visible]);

  async function handleSave() {
    if (!name.trim()) { setError('Ingresá un nombre'); return; }
    const latNum = parseFloat(lat), lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) { setError('Ingresá coordenadas válidas'); return; }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), lat: latNum, lng: lngNum, radius_meters: radius });
      onClose();
    } catch { setError('Error al guardar.'); }
    finally { setSaving(false); }
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
          <Input label="Nombre" value={name} onChangeText={setName} placeholder="Ej: Casa, Trabajo..." />

          <View className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5">
            <Text className="text-sm text-indigo-700 leading-5">
              En mobile podés tocar el mapa para marcar la ubicación. En web, ingresá las coordenadas manualmente.
            </Text>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input label="Latitud" value={lat} onChangeText={setLat}
                placeholder="-34.6083" keyboardType="numeric" />
            </View>
            <View className="flex-1">
              <Input label="Longitud" value={lng} onChangeText={setLng}
                placeholder="-58.3712" keyboardType="numeric" />
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Radio de alerta</Text>
            <View className="flex-row flex-wrap gap-2">
              {RADIUS_OPTIONS.map((r) => (
                <TouchableOpacity
                  key={r} onPress={() => setRadius(r)}
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
