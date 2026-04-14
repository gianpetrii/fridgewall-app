import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Container } from '../../components/layout/Container';
import { Logo } from '../../components/ui/Logo';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);

  async function handleLogin() {
    if (!email || !password) { setError('Completá todos los campos'); return; }
    setLoading(true);
    setError('');
    setEmailNotConfirmed(false);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    console.log('[login] data:', JSON.stringify(data?.user?.email_confirmed_at), 'error:', authError?.message);
    setLoading(false);
    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes('email not confirmed')) {
        setEmailNotConfirmed(true);
        setError('Tu email todavía no fue confirmado. Revisá tu bandeja de entrada.');
        return;
      }
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos'
          : authError.message
      );
    }
  }

  async function handleResend() {
    if (!email) { setError('Ingresá tu email para reenviar la confirmación'); return; }
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
    if (resendError) Alert.alert('Error', resendError.message);
    else Alert.alert('Email reenviado', 'Revisá tu bandeja de entrada y hacé click en el link.');
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <Container>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            <View className="items-center pt-14 pb-10 gap-4">
              <Logo size="lg" />
              <View className="items-center gap-1">
                <Text className="text-2xl font-bold text-zinc-900 tracking-tight">HappeningNow</Text>
                <Text className="text-sm text-zinc-500 text-center leading-5">
                  Anticipate a los eventos que afectan tu movimiento
                </Text>
              </View>
            </View>

            <View className="gap-4">
              <Text className="text-xl font-bold text-zinc-900">Iniciar sesión</Text>

              <Input label="Email" value={email} onChangeText={setEmail}
                placeholder="tu@email.com" keyboardType="email-address"
                autoCapitalize="none" autoCorrect={false} />

              <Input label="Contraseña" value={password} onChangeText={setPassword}
                placeholder="••••••••" secureTextEntry />

              {error ? (
                <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 gap-2">
                  <Text className="text-red-600 text-sm text-center">{error}</Text>
                  {emailNotConfirmed && (
                    <TouchableOpacity onPress={handleResend}>
                      <Text className="text-indigo-600 text-sm text-center font-semibold">
                        Reenviar email de confirmación
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              <Button label="Entrar" onPress={handleLogin} loading={loading} />

              <View className="flex-row justify-center py-4">
                <Text className="text-zinc-500 text-base">¿No tenés cuenta? </Text>
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity>
                    <Text className="text-indigo-600 font-semibold text-base">Registrate</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </Container>
    </SafeAreaView>
  );
}
