import { Stack } from 'expo-router';
import { ShellProviders } from '@/components/layout/ShellProviders';
import { authStackScreenOptions } from '@/constants/navigation';

export default function AuthLayout() {
  return (
    <ShellProviders>
      <Stack screenOptions={authStackScreenOptions}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="confirm-email" />
      </Stack>
    </ShellProviders>
  );
}
