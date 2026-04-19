import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Moon, Sun, Monitor, LogOut, ChevronRight, Bell } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import type { ColorScheme } from '@/types';

const themeOptions: { value: ColorScheme; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

export default function ProfileScreen() {
  const { user, logout, isLoading } = useAuthStore();
  const { colorScheme, setColorScheme } = useThemeStore();
  const [themeDialogOpen, setThemeDialogOpen] = React.useState(false);

  return (
    <Screen>
      <View className="gap-6 pt-4">
        <View className="items-center gap-3 py-4">
          <Avatar
            src={user?.avatarUrl}
            fallback={user?.name ?? user?.email}
            size="xl"
          />
          <View className="items-center">
            <Text variant="h3">{user?.name ?? 'Usuario'}</Text>
            <Text variant="muted">{user?.email}</Text>
          </View>
        </View>

        <Card>
          <CardContent className="pt-6 gap-0">
            <SettingRow
              icon={Bell}
              label="Notificaciones"
              onPress={() => {}}
            />
            <Separator />
            <SettingRow
              icon={Sun}
              label="Apariencia"
              value={themeOptions.find((t) => t.value === colorScheme)?.label}
              onPress={() => setThemeDialogOpen(true)}
            />
          </CardContent>
        </Card>

        <Button
          variant="destructive"
          size="lg"
          loading={isLoading}
          onPress={logout}
        >
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
                onPress={() => {
                  setColorScheme(value);
                  setThemeDialogOpen(false);
                }}
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
    <Pressable
      className="flex-row items-center gap-3 py-3 active:opacity-70"
      onPress={onPress}
    >
      <Icon size={20} color="#71717a" />
      <Text variant="p" className="flex-1">
        {label}
      </Text>
      {value && <Text variant="muted">{value}</Text>}
      <ChevronRight size={18} color="#71717a" />
    </Pressable>
  );
}
