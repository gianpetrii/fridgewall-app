import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export default function ConfirmEmailScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center px-6 bg-background">
      <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-6">
        <Mail size={36} color="#18181b" />
      </View>

      <Text variant="h2" className="mb-3 text-center">
        Confirmá tu email
      </Text>

      <Text variant="muted" className="text-center mb-10 max-w-xs">
        Te enviamos un email de confirmación. Revisá tu bandeja de entrada y hacé clic en el
        enlace para activar tu cuenta.
      </Text>

      <Button
        variant="outline"
        className="w-full"
        onPress={() => router.replace('/(auth)/login')}
      >
        Volver al login
      </Button>
    </View>
  );
}
