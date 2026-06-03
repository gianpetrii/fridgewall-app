"use client";
import * as React from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { X } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { ShellProviders } from '@/components/layout/ShellProviders';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupsStore } from '@/store/useGroupsStore';
import { usePostsStore } from '@/store/usePostsStore';
import { returnToDeviceHome } from '@/lib/deviceHome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { prependPhotoToPayload } from '@/widgets/buildPayload';
import { WIDGET_DATA_KEY } from '@/widgets/widgetTaskHandler';
import type { StoredWidgetData } from '@/widgets/types';
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
  const { source, uri: editedUri, fromEditor, reopenPicker } = useLocalSearchParams<{
    source?: Source;
    uri?: string;
    fromEditor?: string;
    reopenPicker?: string;
  }>();
  const { toast } = useToast();

  const safeClose = React.useCallback(() => {
    if (router.canGoBack()) {
      router.dismiss();
    } else {
      router.replace('/(app)');
    }
  }, [router]);

  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { groups, activeGroupId, fetchGroups } = useGroupsStore();
  const { uploadAndPost, isUploading, uploadProgress } = usePostsStore();

  const [pendingUri, setPendingUri] = React.useState<string | null>(
    fromEditor === '1' && editedUri ? editedUri : null,
  );
  const [launched, setLaunched] = React.useState(fromEditor === '1');

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0] ?? null;

  React.useEffect(() => {
    if (user && groups.length === 0) {
      fetchGroups(user.id);
    }
  }, [user]);

  React.useEffect(() => {
    if (fromEditor === '1' && editedUri) {
      setPendingUri(editedUri);
      setLaunched(true);
    }
  }, [fromEditor, editedUri]);

  const goToEditor = React.useCallback(
    (uri: string) => {
      router.replace({
        pathname: '/photo-editor',
        params: { uri, source: source ?? 'gallery' },
      });
    },
    [router, source],
  );

  const openCamera = React.useCallback(async (): Promise<'picked' | 'canceled' | 'denied'> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara.');
      safeClose();
      return 'denied';
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.9,
    });
    if (result.canceled) {
      return 'canceled' as const;
    }
    goToEditor(result.assets[0].uri);
    return 'picked' as const;
  }, [goToEditor, safeClose]);

  const openGallery = React.useCallback(async (): Promise<'picked' | 'canceled' | 'denied'> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      safeClose();
      return 'denied';
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });
    if (result.canceled) {
      return 'canceled' as const;
    }
    goToEditor(result.assets[0].uri);
    return 'picked' as const;
  }, [goToEditor, safeClose]);

  const launchPicker = React.useCallback(async () => {
    if (!source) {
      safeClose();
      return;
    }
    for (;;) {
      const result = source === 'camera' ? await openCamera() : await openGallery();
      if (result !== 'canceled') break;
    }
  }, [source, openCamera, openGallery, safeClose]);

  React.useEffect(() => {
    if (!activeGroup || !source) return;
    if (reopenPicker === '1') {
      setLaunched(true);
      setPendingUri(null);
      void launchPicker();
      return;
    }
    if (!launched && fromEditor !== '1') {
      setLaunched(true);
      void launchPicker();
    }
  }, [launched, activeGroup, source, reopenPicker, fromEditor, launchPicker]);

  const handleCancelPublish = () => {
    if (source) {
      setPendingUri(null);
      router.replace({
        pathname: '/upload-modal',
        params: { source, reopenPicker: '1' },
      });
      return;
    }
    safeClose();
  };

  const handleUpload = async () => {
    if (!pendingUri || !activeGroup || !user) return;
    try {
      const firebaseUrl = await uploadAndPost(
        activeGroup.id,
        user.id,
        user.name,
        pendingUri,
        undefined,
      );
      let existing: StoredWidgetData | null = null;
      try {
        const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
        if (raw) existing = JSON.parse(raw) as StoredWidgetData;
      } catch {
        existing = null;
      }
      await saveWidgetData(
        prependPhotoToPayload(
          existing,
          {
            photoUrl: firebaseUrl,
            localUri: pendingUri,
            posterName: user.name,
            createdAt: Date.now(),
          },
          activeGroup.name,
        ),
      );
      toast({ message: '¡Foto publicada! 🧲', variant: 'success' });
      await new Promise((resolve) => setTimeout(resolve, 800));
      returnToDeviceHome();
    } catch {
      Alert.alert('Error', 'No se pudo subir la foto. Intentá de nuevo.');
    }
  };

  if (!activeGroup || !launched) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!pendingUri) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <ActivityIndicator size="large" />
        {source ? (
          <Pressable onPress={safeClose} className="mt-6 py-2 px-4">
            <Text variant="muted">Salir</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 16, paddingHorizontal: 16 }}>
      <View className="flex-row items-center justify-between pb-4">
        <Text variant="h3">Publicar</Text>
        <Pressable
          onPress={handleCancelPublish}
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
  );
}
