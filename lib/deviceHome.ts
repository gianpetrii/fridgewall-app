import { BackHandler, Platform } from 'react-native';
import { goToDeviceHome as goToDeviceHomeIOS } from '@/modules/FridgeWallSharedData';

/** Vuelve a la pantalla de inicio del teléfono tras publicar. */
export function returnToDeviceHome(): void {
  if (Platform.OS === 'ios') {
    goToDeviceHomeIOS();
    return;
  }
  if (Platform.OS === 'android') {
    BackHandler.exitApp();
  }
}
