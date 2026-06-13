"use client";
import * as React from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { ShellProviders } from '@/components/layout/ShellProviders';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupsStore } from '@/store/useGroupsStore';
import { returnToDeviceHome } from '@/lib/deviceHome';
import { saveWidgetDataForGroupDirect } from '@/widgets/updateWidget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WIDGET_DATA_KEY } from '@/widgets/widgetTaskHandler';
import type { StoredWidgetData } from '@/widgets/types';
import { goToDeviceHome } from '@/modules/FridgeWallSharedData';

// Guarda el wall seleccionado en UserDefaults compartido via native module
async function saveSelectedWallNative(groupId: string): Promise<void> {
  try {
    // Sincronizamos datos del grupo seleccionado para que el widget los tenga
    const raw = await AsyncStorage.getItem(`${WIDGET_DATA_KEY}_${groupId}`);
    if (raw) {
      const data = JSON.parse(raw) as StoredWidgetData;
      await saveWidgetDataForGroupDirect(groupId, data);
    }
  } catch {
    // silencioso
  }
}

export default function SelectWallScreen() {
  return (
    <ShellProviders>
      <SelectWallContent />
    </ShellProviders>
  );
}

function SelectWallContent() {
  const insets = useSafeAreaInsets();
  const { fromWidget } = useLocalSearchParams<{ fromWidget?: string }>();
  const { user } = useAuthStore();
  const { groups, activeGroupId, fetchGroups } = useGroupsStore();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (user && groups.length === 0) fetchGroups(user.id);
  }, [user]);

  const handleSelect = async (groupId: string) => {
    if (saving) return;
    setSaving(true);
    setSelectedId(groupId);
    await saveSelectedWallNative(groupId);
    // Volver al inicio del dispositivo si venimos del widget
    if (fromWidget === '1') {
      returnToDeviceHome();
    }
  };

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: insets.bottom + 16 }}
    >
      <Text variant="h3" className="mb-1">Elegí el wall</Text>
      <Text variant="muted" className="mb-6 text-sm">El widget mostrará las fotos de este wall.</Text>

      {groups.map((group) => (
        <Pressable
          key={group.id}
          onPress={() => void handleSelect(group.id)}
          disabled={saving}
          className="flex-row items-center justify-between bg-muted rounded-2xl px-5 py-4 mb-3"
        >
          <Text className="font-semibold text-base">{group.name}</Text>
          {(selectedId ?? activeGroupId) === group.id && (
            <Check size={18} color="#71717a" />
          )}
        </Pressable>
      ))}
    </View>
  );
}
