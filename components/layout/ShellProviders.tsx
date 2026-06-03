import * as React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { vars } from 'nativewind';
import { ToastProvider } from '@/components/ui/toast';
import { useThemeStore } from '@/store/useThemeStore';
import { Colors } from '@/constants/colors';

const lightVars = vars({
  '--background': '0 0% 100%',
  '--foreground': '240 10% 3.9%',
  '--card': '0 0% 100%',
  '--card-foreground': '240 10% 3.9%',
  '--border': '240 5.9% 90%',
  '--input': '240 5.9% 90%',
  '--primary': '240 5.9% 10%',
  '--primary-foreground': '0 0% 98%',
  '--secondary': '240 4.8% 95.9%',
  '--secondary-foreground': '240 5.9% 10%',
  '--muted': '240 4.8% 95.9%',
  '--muted-foreground': '240 3.8% 46.1%',
  '--accent': '240 4.8% 95.9%',
  '--accent-foreground': '240 5.9% 10%',
  '--destructive': '0 84.2% 60.2%',
  '--destructive-foreground': '0 0% 98%',
  '--ring': '240 5.9% 10%',
});

const darkVars = vars({
  '--background': '240 10% 3.9%',
  '--foreground': '0 0% 98%',
  '--card': '240 10% 3.9%',
  '--card-foreground': '0 0% 98%',
  '--border': '240 3.7% 15.9%',
  '--input': '240 3.7% 15.9%',
  '--primary': '0 0% 98%',
  '--primary-foreground': '240 5.9% 10%',
  '--secondary': '240 3.7% 15.9%',
  '--secondary-foreground': '0 0% 98%',
  '--muted': '240 3.7% 15.9%',
  '--muted-foreground': '240 5% 64.9%',
  '--accent': '240 3.7% 15.9%',
  '--accent-foreground': '0 0% 98%',
  '--destructive': '0 72.2% 50.6%',
  '--destructive-foreground': '0 0% 98%',
  '--ring': '240 4.9% 83.9%',
});

export function ShellProviders({ children }: { children: React.ReactNode }) {
  const { resolvedScheme } = useThemeStore();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <ToastProvider>
          <View
            className="flex-1"
            style={[
              { backgroundColor: Colors[resolvedScheme].background },
              resolvedScheme === 'dark' ? darkVars : lightVars,
            ]}
          >
            {children}
          </View>
        </ToastProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
