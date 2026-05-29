import { Stack } from 'expo-router';
import { authStackScreenOptions } from '@/constants/navigation';

export default function AuthLayout() {
  return (
    <Stack screenOptions={authStackScreenOptions}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="confirm-email" />
    </Stack>
  );
}
