import { requireNativeModule } from 'expo-modules-core';

interface NativeModule {
  saveWidgetData(json: string): void;
}

let nativeModule: NativeModule | null = null;

try {
  nativeModule = requireNativeModule<NativeModule>('FridgeWallSharedData');
} catch {
  // Módulo no disponible (Expo Go o Android)
}

export function saveWidgetDataNative(data: {
  photoUrl?: string;
  groupName?: string;
  posterName?: string;
  createdAt?: number;
}): void {
  nativeModule?.saveWidgetData(JSON.stringify(data));
}
