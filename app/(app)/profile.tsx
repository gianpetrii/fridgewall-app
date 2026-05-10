import * as React from 'react';
import { View, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Moon, Sun, Monitor, LogOut, Pencil, Check, X } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { updateDisplayName, uploadAvatar } from '@/lib/profile';
import type { ColorScheme } from '@/types';

const themeOptions: { value: ColorScheme; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

export default function ProfileScreen() {
  const { user, logout, setUser, isLoading } = useAuthStore();
  const { colorScheme, setColorScheme } = useThemeStore();

  const [themeDialogOpen, setThemeDialogOpen] = React.useState(false);
  const [editingName, setEditingName] = React.useState(false);
  const [nameInput, setNameInput] = React.useState(user?.name ?? '');
  const [savingName, setSavingName] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [avatarProgress, setAvatarProgress] = React.useState(0);

  const handleSaveName = async () => {
    if (!nameInput.trim() || !user) return;
    setSavingName(true);
    try {
      await updateDisplayName(nameInput.trim());
      setUser({ ...user, name: nameInput.trim() });
      setEditingName(false);
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el nombre.');
    } finally {
      setSavingName(false);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !user) return;

    setUploadingAvatar(true);
    setAvatarProgress(0);
    try {
      const url = await uploadAvatar(result.assets[0].uri, setAvatarProgress);
      setUser({ ...user, avatarUrl: url });
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la foto.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <Screen>
      <View className="gap-6 pt-4">

        {/* Avatar + nombre */}
        <View className="items-center gap-3 py-4">
          <Pressable onPress={handlePickAvatar} className="relative">
            {uploadingAvatar ? (
              <View className="w-24 h-24 rounded-full bg-muted items-center justify-center">
                <ActivityIndicator />
                <Text variant="small" className="text-muted-foreground mt-1">
                  {avatarProgress}%
                </Text>
              </View>
            ) : (
              <Avatar src={user?.avatarUrl} fallback={user?.name ?? user?.email} size="xl" />
            )}
            <View className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary items-center justify-center">
              <Pencil size={13} color="white" />
            </View>
          </Pressable>

          {editingName ? (
            <View className="flex-row items-center gap-2">
              <TextInput
                className="bg-muted rounded-xl px-4 py-2 text-foreground text-center text-lg min-w-40"
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                maxLength={40}
              />
              <Pressable onPress={handleSaveName} disabled={savingName}>
                {savingName
                  ? <ActivityIndicator size="small" />
                  : <Check size={22} color="#22c55e" />
                }
              </Pressable>
              <Pressable onPress={() => { setEditingName(false); setNameInput(user?.name ?? ''); }}>
                <X size={22} color="#71717a" />
              </Pressable>
            </View>
          ) : (
            <Pressable className="flex-row items-center gap-2" onPress={() => setEditingName(true)}>
              <Text variant="h3">{user?.name ?? 'Usuario'}</Text>
              <Pencil size={14} color="#71717a" />
            </Pressable>
          )}

          <Text variant="muted">{user?.email}</Text>
        </View>

        {/* Ajustes */}
        <Card>
          <CardContent className="pt-6 gap-0">
            <SettingRow
              icon={Sun}
              label="Apariencia"
              value={themeOptions.find((t) => t.value === colorScheme)?.label}
              onPress={() => setThemeDialogOpen(true)}
            />
          </CardContent>
        </Card>

        <Button variant="destructive" size="lg" loading={isLoading} onPress={logout}>
          <View className="flex-row items-center gap-2">
            <LogOut size={18} color="white" />
            <Text className="text-base font-semibold text-white">Cerrar sesión</Text>
          </View>
        </Button>
      </View>

      <Dialog open={themeDialogOpen} onOpenChange={setThemeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apariencia</DialogTitle>
          </DialogHeader>
          <View className="gap-2 mt-2">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <Pressable
                key={value}
                className={[
                  'flex-row items-center gap-3 p-3 rounded-lg',
                  colorScheme === value ? 'bg-accent' : 'bg-transparent',
                ].join(' ')}
                onPress={() => { setColorScheme(value); setThemeDialogOpen(false); }}
              >
                <Icon size={20} color={colorScheme === value ? '#18181b' : '#71717a'} />
                <Text
                  variant="p"
                  className={colorScheme === value ? 'font-semibold' : 'text-muted-foreground'}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </DialogContent>
      </Dialog>
    </Screen>
  );
}

function SettingRow({
  icon: Icon,
  label,
  value,
  onPress,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable className="flex-row items-center gap-3 py-3 active:opacity-70" onPress={onPress}>
      <Icon size={20} color="#71717a" />
      <Text variant="p" className="flex-1">{label}</Text>
      {value && <Text variant="muted">{value}</Text>}
    </Pressable>
  );
}
