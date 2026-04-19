import * as React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react-native';
import { KeyboardView } from '@/components/layout/KeyboardView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/useAuthStore';
import type { RegisterForm } from '@/types';

const registerSchema = z
  .object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await register(data.email, data.password, data.name);
      router.replace('/(auth)/confirm-email');
    } catch (err) {
      toast({
        message: 'Error al registrarse',
        description: err instanceof Error ? err.message : 'Intentá de nuevo',
        variant: 'error',
      });
    }
  };

  return (
    <KeyboardView>
      <View className="flex-1 justify-center px-6 py-12 bg-background">
        <View className="mb-10">
          <Text variant="h2" className="mb-2">
            Crear cuenta
          </Text>
          <Text variant="muted">Completá el formulario para registrarte</Text>
        </View>

        <View className="gap-4">
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nombre"
                placeholder="Tu nombre"
                autoCapitalize="words"
                returnKeyType="next"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                leftIcon={<User size={18} color="#71717a" />}
              />
            )}
          />

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
                returnKeyType="next"
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

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirmar contraseña"
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
                leftIcon={<Lock size={18} color="#71717a" />}
              />
            )}
          />
        </View>

        <Button
          className="mt-8"
          size="lg"
          loading={isLoading}
          onPress={handleSubmit(onSubmit)}
        >
          Crear cuenta
        </Button>

        <View className="flex-row justify-center items-center mt-6 gap-1">
          <Text variant="muted">¿Ya tenés cuenta?</Text>
          <Pressable onPress={() => router.back()}>
            <Text variant="small" className="text-primary font-semibold">
              Iniciá sesión
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardView>
  );
}
