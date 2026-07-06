"use client";
import * as React from 'react';
import { View, Alert, AppState, Animated, TextInput, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { X, Camera, Image as ImageIcon, ChevronDown, Check, RefreshCw } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { ShellProviders } from '@/components/layout/ShellProviders';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupsStore } from '@/store/useGroupsStore';
import { usePostsStore } from '@/store/usePostsStore';
import { returnToDeviceHome } from '@/lib/deviceHome';
import { exitToAppHome, dismissAllModals } from '@/lib/exitToAppHome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { prependPhotoToPayload } from '@/widgets/buildPayload';
import { WIDGET_DATA_KEY } from '@/widgets/widgetTaskHandler';
import type { StoredWidgetData } from '@/widgets/types';
import {
  saveWidgetDataDirect,
  saveWidgetDataForGroupDirect,
  saveGroupsList,
} from '@/widgets/updateWidget';

const FAILED_UPLOAD_KEY = 'fridgewall_failed_upload';

interface FailedUpload {
  groupId: string;
  groupName: string;
  userId: string;
  userName: string;
  localUri: string;
  failedAt: number;
}

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
  const { source, uri: editedUri, fromEditor, reopenPicker, fromWidget, retryFailed, _s } = useLocalSearchParams<{
    source?: Source;
    uri?: string;
    fromEditor?: string;
    reopenPicker?: string;
    fromWidget?: string;
    retryFailed?: string;
    _s?: string;
  }>();

  const goToAppHome = React.useCallback(() => {
    if (retryFailed === '1') {
      void AsyncStorage.removeItem(FAILED_UPLOAD_KEY);
    }
    exitToAppHome(router);
  }, [router, retryFailed]);

  const finishAfterSuccessfulUpload = React.useCallback(() => {
    if (retryFailed === '1') {
      void AsyncStorage.removeItem(FAILED_UPLOAD_KEY);
    }
    if (fromWidget === '1') {
      dismissAllModals(router);
      setTimeout(() => returnToDeviceHome(), 150);
      return;
    }
    exitToAppHome(router);
  }, [router, fromWidget, retryFailed]);

  const safeClose = goToAppHome;

  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { groups, activeGroupId, fetchGroups } = useGroupsStore();
  const { uploadAndPost, uploadProgress } = usePostsStore();

  const [pendingUri, setPendingUri] = React.useState<string | null>(
    fromEditor === '1' && editedUri ? editedUri : null,
  );
  const [launched, setLaunched] = React.useState(fromEditor === '1');
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);
  const [caption, setCaption] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [uploadPhase, setUploadPhase] = React.useState<'uploading' | 'done'>('uploading');
  // Progreso que nunca retrocede visualmente (el store resetea a 0 al terminar el archivo)
  const [displayProgress, setDisplayProgress] = React.useState(0);
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

  // Sincroniza la lista de grupos para la configuración del widget (necesario en el
  // flujo de deep link desde el widget, donde (app)/_layout.tsx no está montado)
  React.useEffect(() => {
    if (groups.length === 0) return;
    void saveGroupsList(groups.map((g) => ({ id: g.id, name: g.name })));
  }, [groups]);

  React.useEffect(() => {
    if (fromEditor === '1' && editedUri) {
      setPendingUri(editedUri);
      setLaunched(true);
      return;
    }
    if (!source) return;
    setPendingUri(null);
    setCaption('');
    setIsSubmitting(false);
    setUploadPhase('uploading');
    setDisplayProgress(0);
    setLaunched(false);
  }, [source, fromEditor, editedUri, _s, reopenPicker, retryFailed]);

  // El store resetea uploadProgress a 0 en su bloque finally antes de resolver.
  // Usamos displayProgress para nunca mostrar la barra retrocediendo.
  React.useEffect(() => {
    if (isSubmitting && uploadPhase === 'uploading') {
      setDisplayProgress((prev) => Math.max(prev, uploadProgress));
    }
  }, [uploadProgress, isSubmitting, uploadPhase]);

  // Carga el upload fallido cuando se abre en modo retry
  React.useEffect(() => {
    if (retryFailed !== '1') return;
    AsyncStorage.getItem(FAILED_UPLOAD_KEY).then((raw) => {
      if (!raw) return;
      const failed = JSON.parse(raw) as FailedUpload;
      setPendingUri(failed.localUri);
      setSelectedGroupId(failed.groupId);
      setLaunched(true);
    }).catch(() => {});
  }, [retryFailed]);

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

  const goToEditor = React.useCallback(
    async (uri: string) => {
      // El picker nativo (cámara/galería) es un modal que se está cerrando cuando
      // resolvió. Si presentamos el editor (otro modal) en ese instante, iOS
      // descarta la presentación ("present while dismissing") y el editor nunca
      // aparece. Esperamos a que la app vuelva a estar activa + un settle corto.
      await waitForActive();
      await new Promise((r) => setTimeout(r, 350));
      router.push({
        pathname: '/photo-editor',
        params: {
          uri,
          ...(source ? { source } : {}),
          ...(fromWidget === '1' ? { fromWidget: '1' } : {}),
        },
      });
    },
    [router, source, fromWidget, waitForActive],
  );

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
    try {
      const result = source === 'camera' ? await openCamera() : await openGallery();
      if (result === 'canceled') {
        // Volver al selector en vez de re-abrir el mismo picker
        const widgetParam = fromWidget === '1' ? '?fromWidget=1' : '';
        router.replace(`/upload-modal${widgetParam}`);
      }
    } catch {
      safeClose();
    }
  }, [source, openCamera, openGallery, safeClose, router, fromWidget]);

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
    if (uploadPhase === 'done') {
      goToAppHome();
      return;
    }
    if (retryFailed === '1') {
      void AsyncStorage.removeItem(FAILED_UPLOAD_KEY);
      safeClose();
      return;
    }
    safeClose();
  };

  const handleUpload = async () => {
    if (!pendingUri || !selectedGroup || !user || isSubmitting) return;

    setIsSubmitting(true);
    setUploadPhase('uploading');
    setDisplayProgress(0);
    const uri = pendingUri;
    const group = { id: selectedGroup.id, name: selectedGroup.name };
    const poster = { id: user.id, name: user.name };
    const trimmedCaption = caption.trim() || undefined;

    try {
      const firebaseUrl = await uploadAndPost(group.id, poster.id, poster.name, uri, trimmedCaption);

      // Construir payload del widget (incluye localUri para copia de archivo rápida).
      // Leemos del key POR-GRUPO para no arrastrar fotos de otra wall (contaminación).
      let existing: StoredWidgetData | null = null;
      try {
        const raw = await AsyncStorage.getItem(`${WIDGET_DATA_KEY}_${group.id}`);
        if (raw) existing = JSON.parse(raw) as StoredWidgetData;
      } catch {
        existing = null;
      }
      const payload = prependPhotoToPayload(
        existing,
        { photoUrl: firebaseUrl, localUri: uri, posterName: poster.name, createdAt: Date.now(), caption: trimmedCaption },
        group.name,
      );

      await AsyncStorage.removeItem(FAILED_UPLOAD_KEY);
      setUploadPhase('done');

      await Promise.all([
        (async () => {
          try {
            await Promise.race([
              Promise.all([
                saveWidgetDataDirect(payload),
                saveWidgetDataForGroupDirect(group.id, payload),
              ]),
              new Promise<void>((r) => setTimeout(r, 2500)),
            ]);
          } catch {
            // silencioso
          }
        })(),
        new Promise<void>((r) => setTimeout(r, 1500)),
      ]);

      finishAfterSuccessfulUpload();
    } catch (err) {
      setIsSubmitting(false);
      setUploadPhase('uploading' as const);
      setDisplayProgress(0);

      // Límite alcanzado: no es un fallo transitorio, no guardamos para reintento.
      if (err instanceof Error && err.name === 'LimitError') {
        Alert.alert('Límite alcanzado', err.message);
        return;
      }

      const failedUpload: FailedUpload = {
        groupId: group.id,
        groupName: group.name,
        userId: poster.id,
        userName: poster.name ?? '',
        localUri: uri,
        failedAt: Date.now(),
      };
      await AsyncStorage.setItem(FAILED_UPLOAD_KEY, JSON.stringify(failedUpload));

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Error al publicar',
            body: 'No se pudo subir la foto. Toca para reintentar.',
            data: { type: 'upload_error' },
          },
          trigger: null,
        });
      } catch {
        // Notificaciones no disponibles
      }

      Alert.alert('Error', 'No se pudo subir la foto. Intentá de nuevo.');
    }
  };

  if (!source && retryFailed !== '1') {
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
    return <View className="flex-1 bg-background" />;
  }

  if (!pendingUri) {
    return <View className="flex-1 bg-background" />;
  }


  return (
    <Pressable className="flex-1 bg-background" style={{ paddingTop: insets.top + 16, paddingHorizontal: 16 }} onPress={Keyboard.dismiss}>
      <View className="flex-row items-center justify-between pb-4">
        <Text variant="h3">Publicar</Text>
        {!isSubmitting || uploadPhase === 'done' ? (
          <Pressable
            onPress={uploadPhase === 'done' ? goToAppHome : handleCancelPublish}
            className="w-8 h-8 items-center justify-center rounded-full bg-muted"
          >
            <X size={18} color="#71717a" />
          </Pressable>
        ) : null}
      </View>

      <Image
        source={{ uri: pendingUri }}
        style={{ width: '100%', aspectRatio: 1, borderRadius: 16 }}
        contentFit="cover"
      />

      <View className="bg-muted rounded-2xl px-4 py-3 mt-4">
        <TextInput
          value={caption}
          onChangeText={setCaption}
          editable={!isSubmitting}
          placeholder="Agregá una descripción (opcional)"
          placeholderTextColor="#a1a1aa"
          maxLength={120}
          multiline
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={() => Keyboard.dismiss()}
          className="text-foreground text-base"
          style={{ minHeight: 22, maxHeight: 80 }}
        />
      </View>

      <View className="bg-muted rounded-2xl overflow-hidden mt-3">
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

      {isSubmitting ? (
        <View className="mt-4 gap-2">
          {uploadPhase === 'uploading' && (
            <>
              <View className="h-1.5 bg-muted rounded-full overflow-hidden">
                <View
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${displayProgress}%` }}
                />
              </View>
              <Text variant="muted" className="text-center text-sm">
                {displayProgress < 100 ? `Subiendo... ${displayProgress}%` : 'Casi listo...'}
              </Text>
            </>
          )}
          {uploadPhase === 'done' && (
            <View className="items-center gap-1 py-1">
              <Text className="text-2xl">🧲</Text>
              <Text className="font-semibold text-base text-center">¡Foto publicada!</Text>
            </View>
          )}
        </View>
      ) : (
        <>
          {retryFailed === '1' && (
            <View className="flex-row items-center gap-1.5 mt-3 self-center">
              <RefreshCw size={13} color="#71717a" />
              <Text variant="small" className="text-muted-foreground">Reintentando publicación fallida</Text>
            </View>
          )}

          <Button size="lg" className="mt-3" onPress={handleUpload}>
            {retryFailed === '1' ? 'Reintentar' : 'Publicar'}
          </Button>

          {retryFailed === '1' && (
            <Pressable
              onPress={() => router.replace('/upload-modal')}
              className="mt-2 py-3 items-center"
            >
              <Text variant="muted">Usar otra foto</Text>
            </Pressable>
          )}
        </>
      )}
    </Pressable>
  );
}
