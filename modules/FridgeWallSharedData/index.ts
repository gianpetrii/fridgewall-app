import { requireNativeModule } from 'expo-modules-core';

interface NativeModule {
  saveWidgetData(json: string): void;
}

let nativeModule: NativeModule | null = null;

try {
  nativeModule = requireNativeModule<NativeModule>('FridgeWallSharedData');
  // #region agent log
  console.log('[WIDGET-DEBUG] FridgeWallSharedData native module LOADED ok');
  // #endregion
} catch (e) {
  // #region agent log
  console.log('[WIDGET-DEBUG] FridgeWallSharedData native module FAILED to load:', e);
  // #endregion
}

export function saveWidgetDataNative(data: {
  photoUrl?: string;
  groupName?: string;
  posterName?: string;
  createdAt?: number;
}): void {
  // #region agent log
  console.log('[WIDGET-DEBUG] saveWidgetDataNative called, nativeModule:', nativeModule !== null ? 'present' : 'NULL', 'photoUrl:', data.photoUrl?.substring(0, 80));
  // #endregion
  nativeModule?.saveWidgetData(JSON.stringify(data));
}
