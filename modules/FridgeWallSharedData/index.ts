import { requireNativeModule } from 'expo-modules-core';
import type { StoredWidgetData } from '@/widgets/types';

interface SaveWidgetDataResult {
  photosSaved?: number;
  membersSaved?: number;
  error?: string | null;
}

interface NativeModule {
  saveWidgetData(json: string): Promise<SaveWidgetDataResult>;
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
  if (!nativeModule) return;

  saveQueue = saveQueue.then(async () => {
    const result = await nativeModule!.saveWidgetData(JSON.stringify(data));
    // #region agent log
    fetch('http://127.0.0.1:7833/ingest/fd95910a-cb48-4683-9e51-9302b10846ef',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'46b5be'},body:JSON.stringify({sessionId:'46b5be',location:'modules/FridgeWallSharedData/index.ts',message:'native saveWidgetData result',data:result,timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
    // #endregion
  });
  await saveQueue;
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
