import * as React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react-native';
import { KeyboardView } from '@/components/layout/KeyboardView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/useAuthStore';
import type { ForgotPasswordForm } from '@/types';

const forgotSchema = z.object({
  email: z.string().email('Email inválido'),
});

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword, isLoading } = useAuthStore();
  const { toast } = useToast();
  const [sent, setSent] = React.useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      await resetPassword(data.email);
      setSent(true);
    } catch (err) {
      toast({
        message: 'Error',
        description: err instanceof Error ? err.message : 'Intentá de nuevo',
        variant: 'error',
      });
    }
  };

  if (sent) {
    return (
      <View className="flex-1 items-center justify-center px-6 bg-background">
        <CheckCircle size={56} color="#22c55e" className="mb-6" />
        <Text variant="h3" className="mb-3 text-center">
          Email enviado
        </Text>
        <Text variant="muted" className="text-center mb-8">
          Revisá tu bandeja de entrada y seguí las instrucciones para restablecer tu contraseña.
        </Text>
        <Button variant="outline" onPress={() => router.back()}>
          Volver al login
        </Button>
      </View>
    );
  }

  return (
    <KeyboardView>
      <View className="flex-1 px-6 pt-16 pb-12 bg-background">
        <Pressable
          className="flex-row items-center gap-2 mb-10"
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color="#71717a" />
          <Text variant="muted">Volver</Text>
        </Pressable>

        <View className="mb-10">
          <Text variant="h2" className="mb-2">
            Recuperar contraseña
          </Text>
          <Text variant="muted">
            Ingresá tu email y te enviaremos las instrucciones para restablecer tu contraseña.
          </Text>
        </View>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={handleSubmit(onSubmit)}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
              leftIcon={<Mail size={18} color="#71717a" />}
            />
          )}
        />

        <Button
          className="mt-8"
          size="lg"
          loading={isLoading}
          onPress={handleSubmit(onSubmit)}
        >
          Enviar instrucciones
        </Button>
      </View>
    </KeyboardView>
  );
}
