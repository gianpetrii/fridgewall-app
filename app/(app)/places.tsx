import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';
import { usePlacesStore } from '../../store/usePlacesStore';
import { PlaceCard } from '../../components/places/PlaceCard';
import { PlaceFormModal } from '../../components/places/PlaceFormModal';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { SavedPlace } from '../../types';
import { useLocation } from '../../hooks/useLocation';
import { Region } from 'react-native-maps';

export default function PlacesScreen() {
  const { user } = useAuthStore();
  const { places, loading, fetchPlaces, addPlace, updatePlace, deletePlace } = usePlacesStore();
  const { coords } = useLocation();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlace, setEditingPlace] = useState<SavedPlace | null>(null);

  useEffect(() => { if (user) fetchPlaces(user.id); }, [user]);

  const initialRegion: Region | undefined = coords
    ? { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : undefined;

  async function handleSave(data: { name: string; lat: number; lng: number; radius_meters: number }) {
    if (!user) return;
    if (editingPlace) await updatePlace(editingPlace.id, data);
    else await addPlace({ ...data, user_id: user.id, active: true });
  }

  function handleDelete(id: string) {
    Alert.alert('Eliminar lugar', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deletePlace(id) },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <Container>
        <View className="px-5 pt-6 pb-3 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-zinc-900">Mis Ubicaciones</Text>
            <Text className="text-sm text-zinc-400 mt-0.5">Alertas cuando haya eventos cerca</Text>
          </View>
          <View style={{ width: 120 }}>
            <Button label="+ Agregar" onPress={() => { setEditingPlace(null); setModalVisible(true); }} />
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#4f46e5" />
          </View>
        ) : (
          <FlatList
            data={places}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32, paddingTop: 4 }}
            renderItem={({ item }) => (
              <PlaceCard
                place={item}
                onEdit={(p) => { setEditingPlace(p); setModalVisible(true); }}
                onDelete={handleDelete}
                onToggleActive={(id, active) => updatePlace(id, { active })}
              />
            )}
            ListEmptyComponent={
              <View className="items-center px-8 pt-16 gap-4">
                <Text className="text-5xl">📍</Text>
                <Text className="text-lg font-bold text-zinc-900 text-center">Sin ubicaciones guardadas</Text>
                <Text className="text-base text-zinc-500 text-center leading-6">
                  Guardá tu casa, trabajo u otros lugares frecuentes para recibir alertas de eventos cercanos.
                </Text>
                <View className="w-full mt-2">
                  <Button label="Agregar primera ubicación" onPress={() => { setEditingPlace(null); setModalVisible(true); }} />
                </View>
              </View>
            }
          />
        )}
      </Container>

      <PlaceFormModal
        visible={modalVisible}
        initialPlace={editingPlace}
        initialRegion={initialRegion}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}
