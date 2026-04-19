import * as React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import { KeyboardView } from '@/components/layout/KeyboardView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/useAuthStore';
import type { LoginForm } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
    } catch (err) {
      toast({
        message: 'Error al iniciar sesión',
        description: err instanceof Error ? err.message : 'Verifica tus credenciales',
        variant: 'error',
      });
    }
  };

  return (
    <KeyboardView>
      <View className="flex-1 justify-center px-6 py-12 bg-background">
        <View className="mb-10">
          <Text variant="h2" className="mb-2">
            Bienvenido
          </Text>
          <Text variant="muted">Ingresá tu email y contraseña para continuar</Text>
        </View>

        <View className="gap-4">
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
                returnKeyType="next"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                leftIcon={<Mail size={18} color="#71717a" />}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Contraseña"
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                leftIcon={<Lock size={18} color="#71717a" />}
                rightIcon={
                  <Pressable onPress={() => setShowPassword((v) => !v)}>
                    {showPassword ? (
                      <EyeOff size={18} color="#71717a" />
                    ) : (
                      <Eye size={18} color="#71717a" />
                    )}
                  </Pressable>
                }
              />
            )}
          />

          <Pressable
            className="self-end"
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text variant="small" className="text-primary">
              ¿Olvidaste tu contraseña?
            </Text>
          </Pressable>
        </View>

        <Button
          className="mt-8"
          size="lg"
          loading={isLoading}
          onPress={handleSubmit(onSubmit)}
        >
          Iniciar sesión
        </Button>

        <View className="flex-row justify-center items-center mt-6 gap-1">
          <Text variant="muted">¿No tenés cuenta?</Text>
          <Pressable onPress={() => router.push('/(auth)/register')}>
            <Text variant="small" className="text-primary font-semibold">
              Registrate
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardView>
  );
}
