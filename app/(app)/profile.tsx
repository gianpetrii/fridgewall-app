import * as React from 'react';
import { View, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Moon, Sun, Monitor, LogOut, Pencil, Check, X, Trash2, Info } from 'lucide-react-native';
import { Linking } from 'react-native';
import { cn } from '@/lib/utils';
import { getFirebaseErrorMessage } from '@/lib/utils';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
  const { user, logout, deleteAccount, setUser, isLoading } = useAuthStore();
  const { colorScheme, setColorScheme } = useThemeStore();
  const { isDark } = useColorScheme();
  const { toast } = useToast();
  const [deletingAccount, setDeletingAccount] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState('');

  const [themeDialogOpen, setThemeDialogOpen] = React.useState(false);
  const [attributionOpen, setAttributionOpen] = React.useState(false);
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

  const handleSelectTheme = async (value: ColorScheme) => {
    await setColorScheme(value);
    const label = themeOptions.find((t) => t.value === value)?.label ?? value;
    toast({ message: `Apariencia: ${label}`, variant: 'success' });
    setThemeDialogOpen(false);
  };

  const iconColor = isDark ? '#fafafa' : '#18181b';
  const mutedIconColor = '#71717a';

  const handleDeleteAccountPress = () => {
    Alert.alert(
      '¿Eliminar tu cuenta?',
      'Vas a perder acceso a FridgeWall y a todos tus walls. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            setDeletePassword('');
            setDeleteDialogOpen(true);
          },
        },
      ],
    );
  };

  const handleConfirmDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      Alert.alert('Contraseña requerida', 'Ingresá tu contraseña para confirmar la eliminación.');
      return;
    }
    setDeletingAccount(true);
    try {
      await deleteAccount(deletePassword);
      setDeleteDialogOpen(false);
      setDeletePassword('');
    } catch (err) {
      Alert.alert('No se pudo eliminar la cuenta', getFirebaseErrorMessage(err));
    } finally {
      setDeletingAccount(false);
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
              valueClassName="font-medium text-foreground"
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

        <Button
          variant="outline"
          size="lg"
          loading={deletingAccount}
          disabled={isLoading || deletingAccount}
          onPress={handleDeleteAccountPress}
          className="border-destructive"
        >
          <View className="flex-row items-center gap-2">
            <Trash2 size={18} color="#ef4444" />
            <Text className="text-base font-semibold text-destructive">Eliminar cuenta</Text>
          </View>
        </Button>

        <Pressable
          onPress={() => setAttributionOpen(true)}
          className="items-center py-2 active:opacity-50"
        >
          <Info size={16} color="#71717a" />
        </Pressable>
      </View>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeletePassword('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar cuenta</DialogTitle>
          </DialogHeader>
          <Text variant="muted" className="mb-2">
            Por seguridad, confirmá con tu contraseña. Se borrarán tus datos y saldrás de todos tus
            walls.
          </Text>
          <Input
            label="Contraseña"
            placeholder="Tu contraseña"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            value={deletePassword}
            onChangeText={setDeletePassword}
            returnKeyType="done"
            onSubmitEditing={handleConfirmDeleteAccount}
          />
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => {
                setDeleteDialogOpen(false);
                setDeletePassword('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              loading={deletingAccount}
              onPress={handleConfirmDeleteAccount}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={attributionOpen} onOpenChange={setAttributionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créditos</DialogTitle>
          </DialogHeader>
          <View className="gap-3 mt-1">
            <Text variant="muted">
              El ícono de la app fue diseñado por{' '}
              <Text
                variant="muted"
                className="text-primary underline"
                onPress={() => Linking.openURL('https://www.flaticon.com/authors/freepik')}
              >
                Freepik
              </Text>
              {' '}y está disponible en{' '}
              <Text
                variant="muted"
                className="text-primary underline"
                onPress={() => Linking.openURL('https://www.flaticon.com')}
              >
                Flaticon
              </Text>
              .
            </Text>
          </View>
          <DialogFooter className="mt-4">
            <Button className="flex-1" onPress={() => setAttributionOpen(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={themeDialogOpen} onOpenChange={setThemeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apariencia</DialogTitle>
          </DialogHeader>
          <View className="gap-1 mt-2">
            {themeOptions.map(({ value, label, icon: Icon }) => {
              const selected = colorScheme === value;
              return (
                <Pressable
                  key={value}
                  className={cn(
                    'w-full flex-row items-center gap-3 rounded-xl px-4 py-3 border',
                    selected
                      ? 'bg-accent border-primary'
                      : 'bg-transparent border-transparent',
                  )}
                  onPress={() => void handleSelectTheme(value)}
                >
                  <Icon size={20} color={selected ? iconColor : mutedIconColor} />
                  <Text
                    variant="p"
                    className={cn(
                      'flex-1',
                      selected ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {label}
                  </Text>
                  {selected && <Check size={18} color={iconColor} />}
                </Pressable>
              );
            })}
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
  valueClassName,
  onPress,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  valueClassName?: string;
  onPress: () => void;
}) {
  return (
    <Pressable className="flex-row items-center gap-3 py-3 active:opacity-70" onPress={onPress}>
      <Icon size={20} color="#71717a" />
      <Text variant="p" className="flex-1">{label}</Text>
      {value && <Text variant="muted" className={valueClassName}>{value}</Text>}
    </Pressable>
  );
}
