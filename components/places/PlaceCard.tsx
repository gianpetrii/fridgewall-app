import React from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { SavedPlace } from '../../types';

interface PlaceCardProps {
  place: SavedPlace;
  onEdit: (place: SavedPlace) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
}

export function PlaceCard({ place, onEdit, onDelete, onToggleActive }: PlaceCardProps) {
  return (
    <View className="mx-5 mb-3 bg-white border border-zinc-200 rounded-xl px-4 py-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <View className="w-9 h-9 rounded-xl bg-indigo-100 items-center justify-center">
            <Text className="text-base">📍</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-zinc-900" numberOfLines={1}>{place.name}</Text>
            <Text className="text-xs text-zinc-400 mt-0.5">Radio: {place.radius_meters} m</Text>
          </View>
        </View>
        <Switch
          value={place.active}
          onValueChange={(val) => onToggleActive(place.id, val)}
          trackColor={{ false: '#d4d4d8', true: '#4f46e5' }}
          thumbColor="#fff"
        />
      </View>

      <View className="flex-row gap-2 mt-3">
        <TouchableOpacity
          onPress={() => onEdit(place)}
          className="flex-1 py-2 rounded-xl items-center border border-zinc-300 bg-white"
        >
          <Text className="text-sm font-semibold text-zinc-700">Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete(place.id)}
          className="flex-1 py-2 rounded-xl items-center border border-red-200 bg-red-50"
        >
          <Text className="text-sm font-semibold text-red-500">Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
