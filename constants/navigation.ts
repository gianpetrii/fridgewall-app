import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

export const rootStackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'fade',
  animationDuration: 280,
};

export const authStackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  gestureEnabled: true,
  animationDuration: 280,
};

export const appStackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'fade_from_bottom',
  animationDuration: 320,
};

export const modalScreenOptions: NativeStackNavigationOptions = {
  presentation: 'fullScreenModal',
  animation: 'slide_from_bottom',
  animationDuration: 320,
};
