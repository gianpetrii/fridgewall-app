"use client";
import * as React from 'react';
import { View, ActivityIndicator, Alert, AppState, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera, Image as ImageIcon, ChevronDown, Check } from 'lucide-react-native';
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
import { saveWidgetData, saveWidgetDataForGroup } from '@/widgets/updateWidget';

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
  const { source, uri: editedUri, fromEditor, reopenPicker, fromWidget } = useLocalSearchParams<{
    source?: Source;
    uri?: string;
    fromEditor?: string;
    reopenPicker?: string;
    fromWidget?: string;
  }>();
  const { toast } = useToast();

  const safeClose = React.useCallback(() => {
    if (fromWidget === '1') {
      returnToDeviceHome();
      return;
    }
    if (router.canGoBack()) {
      router.dismiss();
    } else {
      router.replace('/(app)');
    }
  }, [router, fromWidget]);

  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { groups, activeGroupId, fetchGroups } = useGroupsStore();
  const { uploadAndPost, isUploading, uploadProgress } = usePostsStore();

  const [pendingUri, setPendingUri] = React.useState<string | null>(
    fromEditor === '1' && editedUri ? editedUri : null,
  );
  const [launched, setLaunched] = React.useState(fromEditor === '1');
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const chevronAnim = React.useRef(new Animated.Value(0)).current;
  const dropdownAnim = React.useRef(new Animated.Value(0)).current;

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0] ?? null;
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? activeGroup;

  React.useEffect(() => {
    if (user && groups.length === 0) {
      fetchGroups(user.id);
    }
  }, [user]);

  // Inicializa el grupo seleccionado cuando se cargan los grupos
  React.useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(activeGroupId ?? groups[0].id);
    }
  }, [groups, activeGroupId, selectedGroupId]);

  React.useEffect(() => {
    if (fromEditor === '1' && editedUri) {
      setPendingUri(editedUri);
      setLaunched(true);
    }
  }, [fromEditor, editedUri]);

  const goToEditor = React.useCallback(
    (uri: string) => {
      setPendingUri(uri);
    },
    [],
  );

  const waitForActive = React.useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (AppState.currentState === 'active') {
        resolve();
        return;
      }
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          sub.remove();
          resolve();
        }
      });
    });
  }, []);

  const openCamera = React.useCallback(async (): Promise<'picked' | 'canceled' | 'denied'> => {
    await waitForActive();
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
  }, [goToEditor, safeClose, waitForActive]);

  const openGallery = React.useCallback(async (): Promise<'picked' | 'canceled' | 'denied'> => {
    await waitForActive();
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
  }, [goToEditor, safeClose, waitForActive]);

  const launchPicker = React.useCallback(async () => {
    if (!source) {
      safeClose();
      return;
    }
    // Wait for navigation animations to complete before presenting the native
    // picker. iOS silently discards presentations from view controllers that
    // are still mid-animation, causing launchCameraAsync to never resolve.
    await new Promise((r) => setTimeout(r, 450));
    for (;;) {
      try {
        const result = source === 'camera' ? await openCamera() : await openGallery();
        if (result !== 'canceled') break;
      } catch {
        break;
      }
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

  const ITEM_HEIGHT = 52;

  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const dropdownMaxHeight = dropdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, groups.length * ITEM_HEIGHT],
  });

  const dropdownOpacity = dropdownAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const animateDropdown = React.useCallback((open: boolean) => {
    Animated.parallel([
      Animated.timing(chevronAnim, {
        toValue: open ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(dropdownAnim, {
        toValue: open ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [chevronAnim, dropdownAnim]);

  const togglePicker = React.useCallback(() => {
    if (groups.length <= 1) return;
    const willOpen = !isPickerOpen;
    setIsPickerOpen(willOpen);
    animateDropdown(willOpen);
  }, [groups.length, isPickerOpen, animateDropdown]);

  const selectGroup = React.useCallback((groupId: string) => {
    setSelectedGroupId(groupId);
    setIsPickerOpen(false);
    animateDropdown(false);
  }, [animateDropdown]);

  const handleCancelPublish = () => {
    if (fromWidget === '1') {
      returnToDeviceHome();
      return;
    }
    if (source) {
      setLaunched(false);
      setPendingUri(null);
      return;
    }
    safeClose();
  };

  const handleUpload = async () => {
    if (!pendingUri || !selectedGroup || !user) return;
    try {
      const firebaseUrl = await uploadAndPost(
        selectedGroup.id,
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
      const payload = prependPhotoToPayload(
        existing,
        {
          photoUrl: firebaseUrl,
          localUri: pendingUri,
          posterName: user.name,
          createdAt: Date.now(),
        },
        selectedGroup.name,
      );
      await Promise.all([
        saveWidgetData(payload),
        saveWidgetDataForGroup(selectedGroup.id, payload),
      ]);
      toast({ message: '¡Foto publicada! 🧲', variant: 'success' });
      await new Promise((resolve) => setTimeout(resolve, 800));
      returnToDeviceHome();
    } catch {
      Alert.alert('Error', 'No se pudo subir la foto. Intentá de nuevo.');
    }
  };

  if (!source) {
    return (
      <View className="flex-1 bg-background justify-end" style={{ paddingBottom: insets.bottom + 24 }}>
        <View className="px-5">
          <Text variant="h3" className="text-center mb-2">Agregar foto</Text>
          <Text variant="muted" className="text-center mb-6">¿Desde dónde querés subir?</Text>
          <Pressable
            onPress={() => router.replace(`/upload-modal?source=camera${fromWidget === '1' ? '&fromWidget=1' : ''}`)}
            className="flex-row items-center gap-4 bg-muted rounded-2xl px-5 py-4 mb-3"
          >
            <Camera size={24} color="#09090b" />
            <View>
              <Text className="font-semibold text-base">Cámara</Text>
              <Text variant="muted" className="text-sm">Sacá una foto ahora</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.replace(`/upload-modal?source=gallery${fromWidget === '1' ? '&fromWidget=1' : ''}`)}
            className="flex-row items-center gap-4 bg-muted rounded-2xl px-5 py-4 mb-6"
          >
            <ImageIcon size={24} color="#09090b" />
            <View>
              <Text className="font-semibold text-base">Galería</Text>
              <Text variant="muted" className="text-sm">Elegí una foto existente</Text>
            </View>
          </Pressable>
          <Pressable onPress={safeClose} className="py-3 items-center">
            <Text variant="muted">Cancelar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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

      <View className="bg-muted rounded-2xl overflow-hidden mt-4">
        <Pressable
          onPress={togglePicker}
          disabled={groups.length <= 1}
          className="flex-row items-center justify-between px-4"
          style={{ paddingVertical: 14 }}
        >
          <View>
            <Text variant="small" className="text-muted-foreground mb-0.5">Publicar en</Text>
            <Text className="font-semibold text-base">{selectedGroup?.name}</Text>
          </View>
          {groups.length > 1 && (
            <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
              <ChevronDown size={18} color="#71717a" />
            </Animated.View>
          )}
        </Pressable>

        <Animated.View
          style={{ maxHeight: dropdownMaxHeight, opacity: dropdownOpacity, overflow: 'hidden' }}
        >
          <View className="border-t border-border">
            {groups.map((group, index) => (
              <Pressable
                key={group.id}
                onPress={() => selectGroup(group.id)}
                className={`flex-row items-center justify-between px-4 py-3${index < groups.length - 1 ? ' border-b border-border' : ''}`}
              >
                <Text className={group.id === selectedGroupId ? 'font-semibold' : 'text-foreground'}>
                  {group.name}
                </Text>
                {group.id === selectedGroupId && <Check size={16} color="#71717a" />}
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </View>

      {isUploading && (
        <View className="h-1 bg-muted rounded-full overflow-hidden mt-3">
          <View
            className="h-full bg-primary rounded-full"
            style={{ width: `${uploadProgress}%` }}
          />
        </View>
      )}

      <Button size="lg" className="mt-3" loading={isUploading} onPress={handleUpload}>
        Publicar
      </Button>
    </View>
  );
}
