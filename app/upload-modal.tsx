"use client";
import * as React from 'react';
import { View, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { X } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { KeyboardView } from '@/components/layout/KeyboardView';
import { ShellProviders } from '@/components/layout/ShellProviders';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupsStore } from '@/store/useGroupsStore';
import { usePostsStore } from '@/store/usePostsStore';
import { saveWidgetData } from '@/widgets/updateWidget';

type Source = 'camera' | 'gallery';

export default function UploadModal() {
  return (
    <ShellProviders>
      <UploadModalContent />
    </ShellProviders>
  );
}

function UploadModalContent() {
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source: Source }>();
  const { toast } = useToast();

  const safeClose = React.useCallback(() => {
    if (router.canGoBack()) {
      router.dismiss();
    } else {
      router.replace('/(app)');
    }
  }, [router]);

  const { user } = useAuthStore();
  const { groups, activeGroupId, fetchGroups } = useGroupsStore();
  const { uploadAndPost, isUploading, uploadProgress } = usePostsStore();

  const [pendingUri, setPendingUri] = React.useState<string | null>(null);
  const [caption, setCaption] = React.useState('');
  const [launched, setLaunched] = React.useState(false);

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0] ?? null;

  // Cargar walls si aún no están disponibles
  React.useEffect(() => {
    if (user && groups.length === 0) {
      fetchGroups(user.id);
    }
  }, [user]);

  // Abrir picker automáticamente una sola vez que los walls estén listos
  React.useEffect(() => {
    if (!launched && activeGroup) {
      setLaunched(true);
      if (source === 'camera') {
        openCamera();
      } else {
        openGallery();
      }
    }
  }, [launched, activeGroup]);

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara.');
      safeClose();
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) {
      safeClose();
    } else {
      setPendingUri(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      safeClose();
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) {
      safeClose();
    } else {
      setPendingUri(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!pendingUri || !activeGroup || !user) return;
    try {
      const firebaseUrl = await uploadAndPost(activeGroup.id, user.id, user.name, pendingUri, caption || undefined);
      // Actualizar widget con la URL de Firebase (no la URI local)
      saveWidgetData({
        photoUrl: firebaseUrl,
        groupName: activeGroup.name,
        posterName: user.name,
        createdAt: Date.now(),
      });
      toast({ message: '¡Foto publicada! 🧲', variant: 'success' });
      // Pequeña pausa para que el usuario vea el toast antes de cerrar
      await new Promise((resolve) => setTimeout(resolve, 1200));
      safeClose();
    } catch {
      Alert.alert('Error', 'No se pudo subir la foto. Intentá de nuevo.');
    }
  };

  // Loading mientras los walls cargan o el picker aún no se lanzó
  if (!activeGroup || !launched) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Sin foto seleccionada aún (picker abierto o en curso)
  if (!pendingUri) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardView animated={false} scrollProps={{ contentContainerClassName: 'px-4 pb-8' }}>
      <View className="pt-4">
        <View className="flex-row items-center justify-between pb-4">
          <Text variant="h3">Nueva foto</Text>
          <Pressable
            onPress={safeClose}
            className="w-8 h-8 items-center justify-center rounded-full bg-muted"
          >
            <X size={18} color="#71717a" />
          </Pressable>
        </View>

        <Image
          source={{ uri: pendingUri }}
          style={{ width: '100%', aspectRatio: 1, borderRadius: 16 }}
          contentFit="cover"
        />

        <TextInput
          className="bg-muted rounded-xl px-4 py-3 text-foreground mt-4"
          placeholder="¿Qué está pasando? (opcional)"
          placeholderTextColor="#71717a"
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={150}
        />

        {isUploading && (
          <View className="h-1 bg-muted rounded-full overflow-hidden mt-4">
            <View
              className="h-full bg-primary rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </View>
        )}

        <Button size="lg" className="mt-4" loading={isUploading} onPress={handleUpload}>
          Publicar en la wall
        </Button>

        <Text variant="small" className="text-muted-foreground text-center mt-2">
          en {activeGroup.name}
        </Text>
      </View>
    </KeyboardView>
  );
}
