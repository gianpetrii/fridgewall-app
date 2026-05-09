import * as React from 'react';
import { View, FlatList, Pressable, Modal, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Copy, Share2, Users, Hash } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupsStore } from '@/store/useGroupsStore';
import type { Group } from '@/types';

const createSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(30),
});
const joinSchema = z.object({
  code: z.string().length(6, 'El código tiene 6 caracteres'),
});

type ModalMode = 'create' | 'join' | null;

export default function GroupsScreen() {
  const { user } = useAuthStore();
  const { groups, isLoading, fetchGroups, createGroup, joinGroup, activeGroupId, setActiveGroup } =
    useGroupsStore();
  const { toast } = useToast();
  const [modal, setModal] = React.useState<ModalMode>(null);

  const createForm = useForm({ resolver: zodResolver(createSchema), defaultValues: { name: '' } });
  const joinForm = useForm({ resolver: zodResolver(joinSchema), defaultValues: { code: '' } });

  React.useEffect(() => {
    if (user) fetchGroups(user.id);
  }, [user]);

  const handleCreate = async ({ name }: { name: string }) => {
    if (!user) return;
    try {
      const group = await createGroup(name, user.id);
      setModal(null);
      createForm.reset();
      toast({ message: `"${group.name}" creado`, variant: 'success' });
    } catch (err) {
      toast({
        message: 'Error al crear el círculo',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      });
    }
  };

  const handleJoin = async ({ code }: { code: string }) => {
    if (!user) return;
    try {
      const group = await joinGroup(code, user.id);
      setModal(null);
      joinForm.reset();
      toast({ message: `Te uniste a "${group.name}"`, variant: 'success' });
    } catch (err) {
      toast({
        message: 'No se pudo unir',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      });
    }
  };

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    toast({ message: `Código ${code} copiado`, variant: 'success' });
  };

  const shareCode = async (name: string, code: string) => {
    await Share.share({
      message: `Unite a mi círculo "${name}" en FridgeWall con el código: ${code}`,
    });
  };

  const renderGroup = ({ item }: { item: Group }) => {
    const isActive = item.id === activeGroupId;
    return (
      <Pressable onPress={() => setActiveGroup(item.id)}>
        <Card className={isActive ? 'border-primary' : ''}>
          <CardContent className="py-4 px-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                  <Users size={18} color="#71717a" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold">{item.name}</Text>
                  <Text variant="small" className="text-muted-foreground">
                    {item.members.length} {item.members.length === 1 ? 'integrante' : 'integrantes'}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1">
                <View className="flex-row items-center gap-1 px-2 py-1.5 rounded-lg bg-muted mr-1">
                  <Hash size={11} color="#71717a" />
                  <Text variant="small" className="text-muted-foreground font-mono tracking-widest">
                    {item.inviteCode}
                  </Text>
                </View>
                <Pressable
                  className="w-8 h-8 rounded-lg bg-muted items-center justify-center"
                  onPress={() => copyCode(item.inviteCode)}
                >
                  <Copy size={15} color="#71717a" />
                </Pressable>
                <Pressable
                  className="w-8 h-8 rounded-lg bg-muted items-center justify-center"
                  onPress={() => shareCode(item.name, item.inviteCode)}
                >
                  <Share2 size={15} color="#71717a" />
                </Pressable>
              </View>
            </View>
          </CardContent>
        </Card>
      </Pressable>
    );
  };

  return (
    <Screen>
      <View className="flex-1 gap-4">
        <View className="flex-row items-center justify-between pt-4">
          <Text variant="h2">Círculos</Text>
          <View className="flex-row gap-2">
            <Button size="sm" variant="outline" onPress={() => setModal('join')}>
              <Hash size={14} />
              <Text variant="small" className="ml-1">Unirme</Text>
            </Button>
            <Button size="sm" onPress={() => setModal('create')}>
              <Plus size={14} />
              <Text variant="small" className="ml-1 text-primary-foreground">Nuevo</Text>
            </Button>
          </View>
        </View>

        {groups.length === 0 && !isLoading ? (
          <View className="flex-1 items-center justify-center gap-3 pb-20">
            <Text className="text-5xl">👥</Text>
            <Text variant="h4" className="text-center">Todavía no tenés círculos</Text>
            <Text variant="muted" className="text-center px-8">
              Creá un círculo o unite a uno con el código de alguien
            </Text>
            <View className="gap-2 w-full px-6 mt-2">
              <Button size="lg" onPress={() => setModal('create')}>Crear círculo</Button>
              <Button size="lg" variant="outline" onPress={() => setModal('join')}>
                Unirme con código
              </Button>
            </View>
          </View>
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(item) => item.id}
            renderItem={renderGroup}
            contentContainerClassName="gap-3 pb-8"
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Modal crear / unirse */}
      <Modal visible={modal !== null} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setModal(null)}
        >
          <Pressable className="bg-background rounded-t-3xl px-6 pt-6 pb-10">
            {modal === 'create' ? (
              <View className="gap-4">
                <Text variant="h3">Crear círculo</Text>
                <Text variant="muted">
                  Poné un nombre para tu grupo, como "Familia" o "Amigos del cole".
                </Text>
                <Controller
                  control={createForm.control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Nombre del círculo"
                      placeholder="Ej: Familia, Amigos..."
                      autoFocus
                      autoCapitalize="words"
                      returnKeyType="done"
                      onSubmitEditing={createForm.handleSubmit(handleCreate)}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={createForm.formState.errors.name?.message}
                    />
                  )}
                />
                <Button
                  size="lg"
                  loading={isLoading}
                  onPress={createForm.handleSubmit(handleCreate)}
                >
                  Crear círculo
                </Button>
              </View>
            ) : (
              <View className="gap-4">
                <Text variant="h3">Unirme a un círculo</Text>
                <Text variant="muted">
                  Pedile a alguien que comparta su código de 6 caracteres.
                </Text>
                <Controller
                  control={joinForm.control}
                  name="code"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Código de invitación"
                      placeholder="ABC123"
                      autoFocus
                      autoCapitalize="characters"
                      maxLength={6}
                      returnKeyType="done"
                      onSubmitEditing={joinForm.handleSubmit(handleJoin)}
                      value={value}
                      onChangeText={(v) => onChange(v.toUpperCase())}
                      onBlur={onBlur}
                      error={joinForm.formState.errors.code?.message}
                    />
                  )}
                />
                <Button
                  size="lg"
                  loading={isLoading}
                  onPress={joinForm.handleSubmit(handleJoin)}
                >
                  Unirme
                </Button>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
