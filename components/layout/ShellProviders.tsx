import * as React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ToastProvider } from '@/components/ui/toast';
import { useThemeStore } from '@/store/useThemeStore';
import { Colors } from '@/constants/colors';

export function ShellProviders({ children }: { children: React.ReactNode }) {
  const { resolvedScheme } = useThemeStore();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <ToastProvider>
          <View
            className={resolvedScheme === 'dark' ? 'dark flex-1' : 'flex-1'}
            style={{ flex: 1, backgroundColor: Colors[resolvedScheme].background }}
          >
            {children}
          </View>
        </ToastProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
