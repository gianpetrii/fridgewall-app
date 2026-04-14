import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Container } from '../../components/layout/Container';
import { Logo } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';

export default function ConfirmEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [resending, setResending] = useState(false);

  async function handleResend() {
    if (!email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Email reenviado', 'Revisá tu bandeja de entrada.');
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <Container>
        <View className="flex-1 items-center justify-center px-6 gap-6">

          <Logo size="lg" />

          <View className="items-center gap-2">
            <Text className="text-2xl font-bold text-zinc-900 text-center">Confirmá tu email</Text>
            <Text className="text-base text-zinc-500 text-center leading-6 max-w-xs">
              Te enviamos un link a{' '}
              <Text className="text-zinc-900 font-semibold">{email}</Text>.
              {'\n'}Hacé click en el link para activar tu cuenta.
            </Text>
          </View>

          <View className="w-full bg-white border border-zinc-200 rounded-xl p-4 gap-3">
            {[
              'Abrí tu app de email',
              'Buscá el email de HappeningNow',
              'Hacé click en "Confirmar email"',
              'Volvé acá e iniciá sesión',
            ].map((step, i) => (
              <View key={i} className="flex-row items-center gap-3">
                <View className="w-6 h-6 rounded-full bg-indigo-600 items-center justify-center">
                  <Text className="text-xs font-bold text-white">{i + 1}</Text>
                </View>
                <Text className="text-sm text-zinc-700">{step}</Text>
              </View>
            ))}
          </View>

          <View className="w-full gap-3">
            <Button label="Ir al inicio de sesión" onPress={() => router.replace('/(auth)/login')} />
            <Button label="Reenviar email" onPress={handleResend} loading={resending} variant="secondary" />
          </View>

          <Text className="text-xs text-zinc-400 text-center">
            ¿No lo encontrás? Revisá tu carpeta de spam.
          </Text>
        </View>
      </Container>
    </SafeAreaView>
  );
}
