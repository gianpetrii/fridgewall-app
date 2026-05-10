import * as React from 'react';
import { View, FlatList, Pressable, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, Heart, Laugh, Frown, Zap, Trash2, X } from 'lucide-react-native';
import { saveWidgetData } from '@/widgets/updateWidget';
import { Screen } from '@/components/layout/Screen';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupsStore } from '@/store/useGroupsStore';
import { usePostsStore } from '@/store/usePostsStore';
import type { Post, ReactionType } from '@/types';

const REACTIONS: { type: ReactionType; emoji: string }[] = [
  { type: 'heart', emoji: '❤️' },
  { type: 'laugh', emoji: '😂' },
  { type: 'wow', emoji: '😮' },
  { type: 'sad', emoji: '😢' },
];

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  if (h < 24) return `hace ${h}h`;
  return `hace ${d}d`;
}

function PostCard({ post }: { post: Post }) {
  const { user } = useAuthStore();
  const { activeGroupId } = useGroupsStore();
  const { reactions, loadReactions, react, removePost } = usePostsStore();
  const [showReactions, setShowReactions] = React.useState(false);

  React.useEffect(() => {
    if (activeGroupId) loadReactions(activeGroupId, post.id);
  }, [post.id]);

  const postReactions = reactions[post.id] ?? [];
  const isOwner = user?.id === post.userId;

  const handleReact = async (type: ReactionType) => {
    if (!user || !activeGroupId) return;
    setShowReactions(false);
    await react(activeGroupId, post.id, user.id, user.name, type);
  };

  const handleDelete = () => {
    if (!activeGroupId) return;
    Alert.alert('Eliminar foto', '¿Seguro que querés borrar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => removePost(activeGroupId, post.id, post.photoUrl),
      },
    ]);
  };

  const grouped = postReactions.reduce<Record<string, number>>((acc, r) => {
    const emoji = REACTIONS.find((x) => x.type === r.type)?.emoji ?? r.type;
    acc[emoji] = (acc[emoji] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <View className="mb-4">
      <Pressable onLongPress={() => setShowReactions(true)}>
        <Image
          source={{ uri: post.photoUrl }}
          style={{ width: '100%', aspectRatio: 1, borderRadius: 16 }}
          contentFit="cover"
          transition={300}
        />
      </Pressable>

      <View className="flex-row items-center justify-between mt-2 px-1">
        <View className="flex-row items-center gap-2">
          <Text variant="small" className="font-semibold">
            {post.userName ?? 'Alguien'}
          </Text>
          <Text variant="small" className="text-muted-foreground">
            · {timeAgo(post.createdAt)}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          {Object.entries(grouped).map(([emoji, count]) => (
            <View key={emoji} className="flex-row items-center gap-0.5">
              <Text>{emoji}</Text>
              {count > 1 && <Text variant="small" className="text-muted-foreground">{count}</Text>}
            </View>
          ))}
          {isOwner && (
            <Pressable onPress={handleDelete} className="ml-1">
              <Trash2 size={14} color="#71717a" />
            </Pressable>
          )}
        </View>
      </View>

      {post.caption ? (
        <Text variant="small" className="text-muted-foreground px-1 mt-0.5">
          {post.caption}
        </Text>
      ) : null}

      {/* Reaction picker */}
      <Modal visible={showReactions} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center"
          onPress={() => setShowReactions(false)}
        >
          <View className="bg-background rounded-2xl px-6 py-4 flex-row gap-4">
            {REACTIONS.map(({ type, emoji }) => (
              <Pressable key={type} onPress={() => handleReact(type)} className="items-center">
                <Text className="text-3xl">{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function FeedScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { groups, activeGroupId, fetchGroups, isLoading: groupsLoading } = useGroupsStore();
  const { posts, isLoading: postsLoading, isUploading, uploadProgress, subscribeToGroup, uploadAndPost } = usePostsStore();
  const [captionModal, setCaptionModal] = React.useState<string | null>(null);
  const [caption, setCaption] = React.useState('');
  const [pendingUri, setPendingUri] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) fetchGroups(user.id);
  }, [user]);

  React.useEffect(() => {
    if (!activeGroupId) return;
    const unsub = subscribeToGroup(activeGroupId);
    return unsub;
  }, [activeGroupId]);

  // Actualizar el widget con la foto más reciente
  React.useEffect(() => {
    if (posts.length === 0 || !activeGroup) return;
    const latest = posts[0];
    saveWidgetData({
      photoUrl: latest.photoUrl,
      groupName: activeGroup.name,
      posterName: latest.userName,
      createdAt: latest.createdAt,
    });
  }, [posts, activeGroup]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para subir fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPendingUri(result.assets[0].uri);
      setCaptionModal('open');
    }
  };

  const handleUpload = async () => {
    if (!pendingUri || !activeGroupId || !user) return;
    setCaptionModal(null);
    try {
      await uploadAndPost(activeGroupId, user.id, user.name, pendingUri, caption || undefined);
    } catch {
      Alert.alert('Error', 'No se pudo subir la foto. Intentá de nuevo.');
    } finally {
      setPendingUri(null);
      setCaption('');
    }
  };

  const activeGroup = groups.find((g) => g.id === activeGroupId);

  if (!groupsLoading && groups.length === 0) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-3 pb-20">
          <Text className="text-5xl">🧲</Text>
          <Text variant="h4" className="text-center">Tu heladera está vacía</Text>
          <Text variant="muted" className="text-center px-8">
            Creá un círculo e invitá a tus seres queridos para empezar a compartir fotos
          </Text>
          <Button size="lg" className="mt-2" onPress={() => router.push('/(app)/groups')}>
            Crear mi primer círculo
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      {/* Header */}
      <View className="flex-row items-center justify-between pt-4 pb-2">
        <View>
          <Text variant="h2">{activeGroup?.name ?? 'FridgeWall'}</Text>
          {activeGroup && (
            <Text variant="small" className="text-muted-foreground">
              {activeGroup.members.length} integrante{activeGroup.members.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <Pressable
          className="w-12 h-12 rounded-full bg-primary items-center justify-center"
          onPress={pickImage}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Camera size={22} color="white" />
          )}
        </Pressable>
      </View>

      {/* Upload progress */}
      {isUploading && (
        <View className="h-1 bg-muted rounded-full overflow-hidden mb-2">
          <View
            className="h-full bg-primary rounded-full"
            style={{ width: `${uploadProgress}%` }}
          />
        </View>
      )}

      {/* Feed */}
      {postsLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : posts.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 pb-20">
          <Text className="text-5xl">📸</Text>
          <Text variant="h4" className="text-center">Todavía no hay fotos</Text>
          <Text variant="muted" className="text-center px-8">
            Sé el primero en dejar una foto en la heladera
          </Text>
          <Button variant="outline" onPress={pickImage}>Subir foto</Button>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard post={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-8"
        />
      )}

      {/* Caption modal */}
      <Modal visible={captionModal === 'open'} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setCaptionModal(null)}
        >
          <Pressable className="bg-background rounded-t-3xl px-6 pt-6 pb-10 gap-4">
            <View className="flex-row items-center justify-between">
              <Text variant="h3">Agregar descripción</Text>
              <Pressable onPress={() => setCaptionModal(null)}>
                <X size={20} color="#71717a" />
              </Pressable>
            </View>
            {pendingUri && (
              <Image
                source={{ uri: pendingUri }}
                style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }}
                contentFit="cover"
              />
            )}
            <TextInput
              className="bg-muted rounded-xl px-4 py-3 text-foreground"
              placeholder="¿Qué está pasando? (opcional)"
              placeholderTextColor="#71717a"
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={150}
            />
            <Button size="lg" onPress={handleUpload}>
              Publicar en la heladera
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
