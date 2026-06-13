import { requireNativeModule } from 'expo-modules-core';
import type { StoredWidgetData, GroupInfo } from '@/widgets/types';

interface SaveWidgetDataResult {
  photosSaved?: number;
  membersSaved?: number;
  error?: string | null;
}

interface NativeModule {
  saveWidgetData(json: string): Promise<SaveWidgetDataResult>;
  saveWidgetDataForGroup(groupId: string, json: string): Promise<SaveWidgetDataResult>;
  saveAllGroups(json: string): Promise<void>;
  advanceWidgetCarousel(): Promise<{ advanced: boolean; carouselIndex?: number }>;
  goToHomeScreen(): void;
}

let saveQueue: Promise<void> = Promise.resolve();

let nativeModule: NativeModule | null = null;

try {
  nativeModule = requireNativeModule<NativeModule>('FridgeWallSharedData');
} catch {
  nativeModule = null;
}

export async function saveWidgetDataNative(data: StoredWidgetData): Promise<void> {
  if (!nativeModule) {
    console.warn('[Widget] nativeModule is null – skipping native save');
    return;
  }

  const task = async () => {
    try {
      const result = await nativeModule!.saveWidgetData(JSON.stringify(data));
      console.log('[Widget] saveWidgetData native OK', JSON.stringify(result));
    } catch (e) {
      console.error('[Widget] saveWidgetData native ERROR', String(e));
      throw e;
    }
  };
  // .then(task, task) ensures task runs regardless of previous queue state,
  // preventing a single failed save from permanently breaking the queue.
  saveQueue = saveQueue.then(task, task);
  await saveQueue;
}

export async function saveWidgetDataForGroupNative(groupId: string, data: StoredWidgetData): Promise<void> {
  if (!nativeModule) return;
  const task = async () => {
    await nativeModule!.saveWidgetDataForGroup(groupId, JSON.stringify(data));
  };
  saveQueue = saveQueue.then(task, task);
  await saveQueue;
}

/**
 * Guardado directo sin pasar por la saveQueue. Usar solo desde handleUpload
 * para garantizar que el save ocurre antes de suspender/cerrar la app.
 */
export async function saveWidgetDataNativeDirect(data: StoredWidgetData): Promise<void> {
  if (!nativeModule) return;
  try {
    const result = await nativeModule.saveWidgetData(JSON.stringify(data));
    console.log('[Widget] saveWidgetData direct OK', JSON.stringify(result));
  } catch (e) {
    console.error('[Widget] saveWidgetData direct ERROR', String(e));
  }
}

export async function saveWidgetDataForGroupNativeDirect(
  groupId: string,
  data: StoredWidgetData,
): Promise<void> {
  if (!nativeModule) return;
  try {
    await nativeModule.saveWidgetDataForGroup(groupId, JSON.stringify(data));
  } catch {
    // silent
  }
}

export async function saveAllGroupsNative(groups: GroupInfo[]): Promise<void> {
  if (!nativeModule) return;
  await nativeModule.saveAllGroups(JSON.stringify(groups));
}

export async function advanceWidgetCarouselNative(): Promise<void> {
  if (!nativeModule) return;
  await nativeModule.advanceWidgetCarousel();
}

/** Envía la app al background (pantalla de inicio del dispositivo). */
export function goToDeviceHome(): void {
  if (nativeModule?.goToHomeScreen) {
    nativeModule.goToHomeScreen();
  }
}
