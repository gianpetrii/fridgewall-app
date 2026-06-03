import * as React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { KeyboardView } from '@/components/layout/KeyboardView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/useAuthStore';
import { getFirebaseErrorMessage } from '@/lib/utils';
import type { LoginForm } from '@/types';

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export default function LoginScreen() {
  const router = useRouter();
  const { login, signInWithGoogle, isLoading } = useAuthStore();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      toast({ message: getFirebaseErrorMessage(err), variant: 'error' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

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
      toast({ message: getFirebaseErrorMessage(err), variant: 'error' });
    }
  };

  return (
    <KeyboardView>
      <View className="flex-1 justify-center px-6 py-12 bg-background">
        <View className="mb-10">
          <Text className="text-4xl mb-1">🧲</Text>
          <Text variant="h2" className="mb-2">FridgeWall</Text>
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
                    {showPassword ? <EyeOff size={18} color="#71717a" /> : <Eye size={18} color="#71717a" />}
                  </Pressable>
                }
              />
            )}
          />

          <Pressable className="self-end" onPress={() => router.push('/(auth)/forgot-password')}>
            <Text variant="small" className="text-primary">¿Olvidaste tu contraseña?</Text>
          </Pressable>
        </View>

        <Button className="mt-8" size="lg" loading={isLoading} onPress={handleSubmit(onSubmit)}>
          Iniciar sesión
        </Button>

        <View className="flex-row items-center gap-3 mt-5">
          <View className="flex-1 h-px bg-border" />
          <Text variant="muted" className="text-xs">o continuá con</Text>
          <View className="flex-1 h-px bg-border" />
        </View>

        <Button
          variant="outline"
          size="lg"
          className="mt-4"
          loading={isGoogleLoading}
          disabled={isLoading}
          onPress={handleGoogleSignIn}
        >
          <View className="flex-row items-center gap-3">
            <GoogleIcon />
            <Text className="text-foreground font-semibold text-base">Continuar con Google</Text>
          </View>
        </Button>

        <View className="flex-row justify-center items-center mt-6 gap-1">
          <Text variant="muted">¿No tenés cuenta?</Text>
          <Pressable onPress={() => router.push('/(auth)/register')}>
            <Text variant="small" className="text-primary font-semibold">Registrate</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardView>
  );
}
