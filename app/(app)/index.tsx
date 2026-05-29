import * as React from 'react';
import { View, FlatList, Pressable, ActivityIndicator, Share, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { Users, Copy, Share2, Hash, ChevronRight, Trash2 } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupsStore } from '@/store/useGroupsStore';
import { getUsersByIds } from '@/lib/users';
import { copy } from '@/constants/copy';
import type { Group, User } from '@/types';

function MemberRow({ member, isYou }: { member: User; isYou: boolean }) {
  return (
    <View className="flex-row items-center gap-3 py-2">
      <Avatar src={member.avatarUrl} fallback={member.name ?? member.email} size="sm" />
      <View className="flex-1">
        <Text className="font-medium">
          {member.name ?? member.email.split('@')[0]}
          {isYou ? ' (vos)' : ''}
        </Text>
        <Text variant="small" className="text-muted-foreground">
          {member.email}
        </Text>
      </View>
    </View>
  );
}

function GroupCard({
  group,
  members,
  currentUserId,
  onCopyCode,
  onShareCode,
  onDelete,
  isOwner,
}: {
  group: Group;
  members: User[];
  currentUserId: string;
  onCopyCode: (code: string) => void;
  onShareCode: (name: string, code: string) => void;
  onDelete?: () => void;
  isOwner?: boolean;
}) {
  const orderedMembers = React.useMemo(() => {
    const you = members.find((m) => m.id === currentUserId);
    const rest = members.filter((m) => m.id !== currentUserId);
    return you ? [you, ...rest] : members;
  }, [members, currentUserId]);

  return (
    <Card>
      <CardContent className="py-4 px-4 gap-3">
        <View className="flex-row items-center gap-3">
          <View className="w-11 h-11 rounded-full bg-primary/10 items-center justify-center">
            <Users size={20} color="#71717a" />
          </View>
          <View className="flex-1">
            <Text variant="h4">{group.name}</Text>
            <Text variant="small" className="text-muted-foreground">
              {group.members.length}{' '}
              {group.members.length === 1 ? 'integrante' : 'integrantes'}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-1">
          <View className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted flex-1">
            <Hash size={11} color="#71717a" />
            <Text variant="small" className="text-muted-foreground font-mono tracking-widest">
              {group.inviteCode}
            </Text>
          </View>
          <Pressable
            className="w-9 h-9 rounded-lg bg-muted items-center justify-center"
            onPress={() => onCopyCode(group.inviteCode)}
          >
            <Copy size={15} color="#71717a" />
          </Pressable>
          <Pressable
            className="w-9 h-9 rounded-lg bg-muted items-center justify-center"
            onPress={() => onShareCode(group.name, group.inviteCode)}
          >
            <Share2 size={15} color="#71717a" />
          </Pressable>
          {isOwner && onDelete && (
            <Pressable
              className="w-9 h-9 rounded-lg bg-destructive/10 items-center justify-center"
              onPress={onDelete}
            >
              <Trash2 size={15} color="#ef4444" />
            </Pressable>
          )}
        </View>

        <View className="border-t border-border pt-1">
          {orderedMembers.length === 0 ? (
            <Text variant="small" className="text-muted-foreground py-2">
              Cargando integrantes…
            </Text>
          ) : (
            orderedMembers.map((member) => (
              <MemberRow key={member.id} member={member} isYou={member.id === currentUserId} />
            ))
          )}
        </View>
      </CardContent>
    </Card>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { groups, isLoading: groupsLoading, fetchGroups, removeGroup } = useGroupsStore();
  const { toast } = useToast();
  const [membersByGroup, setMembersByGroup] = React.useState<Record<string, User[]>>({});
  const [membersLoading, setMembersLoading] = React.useState(false);

  React.useEffect(() => {
    if (user) fetchGroups(user.id);
  }, [user, fetchGroups]);

  React.useEffect(() => {
    if (groups.length === 0) {
      setMembersByGroup({});
      return;
    }

    let cancelled = false;
    setMembersLoading(true);
    (async () => {
      try {
        const entries = await Promise.all(
          groups.map(async (group) => {
            const members = await getUsersByIds(group.members);
            return [group.id, members] as const;
          }),
        );
        if (!cancelled) {
          setMembersByGroup(Object.fromEntries(entries));
        }
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [groups]);

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    toast({ message: `Código ${code} copiado`, variant: 'success' });
  };

  const shareCode = async (name: string, code: string) => {
    await Share.share({
      message: copy.shareInvite(name, code),
    });
  };

  const handleDeleteGroup = (group: Group) => {
    Alert.alert(
      copy.deleteWall,
      copy.deleteWallConfirm(group.name),
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              await removeGroup(group.id, user.id);
              toast({ message: `"${group.name}" eliminado`, variant: 'success' });
            } catch (err) {
              toast({
                message: 'No se pudo eliminar',
                description: err instanceof Error ? err.message : undefined,
                variant: 'error',
              });
            }
          },
        },
      ],
    );
  };

  if (!groupsLoading && groups.length === 0) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-3 pb-20">
          <Text className="text-5xl">👥</Text>
          <Text variant="h4" className="text-center">{copy.noWallsYet}</Text>
          <Text variant="muted" className="text-center px-8">
            Creá un wall e invitá a tus seres queridos. Las fotos las ves en el widget de tu
            pantalla de inicio.
          </Text>
          <Button size="lg" className="mt-2" onPress={() => router.push('/(app)/groups')}>
            {copy.firstWall}
          </Button>
        </View>
      </Screen>
    );
  }

  const isLoading = groupsLoading || membersLoading;

  return (
    <Screen scrollable={false}>
      <View className="flex-1 gap-4">
        <View className="pt-4 gap-1">
          <Text variant="h2">{copy.myWalls}</Text>
          <Text variant="muted">{copy.widgetPhotosHint}</Text>
        </View>

        <Pressable
          className="flex-row items-center justify-between px-4 py-3 rounded-xl bg-muted"
          onPress={() => router.push('/(app)/groups')}
        >
          <Text className="font-medium">{copy.createOrJoin}</Text>
          <ChevronRight size={18} color="#71717a" />
        </Pressable>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <GroupCard
                group={item}
                members={membersByGroup[item.id] ?? []}
                currentUserId={user?.id ?? ''}
                onCopyCode={copyCode}
                onShareCode={shareCode}
                isOwner={item.createdBy === user?.id}
                onDelete={() => handleDeleteGroup(item)}
              />
            )}
            contentContainerClassName="gap-3 pb-8"
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Screen>
  );
}
