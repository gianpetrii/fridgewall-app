import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Container } from '../../components/layout/Container';
import { Logo } from '../../components/ui/Logo';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    if (!email || !password || !confirmPassword) { setError('Completá todos los campos'); return; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    setError('');
    const { data, error: authError } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    if (!data.session) {
      router.replace({ pathname: '/(auth)/confirm-email', params: { email } });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <Container>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            <View className="items-center pt-10 pb-8 gap-4">
              <Logo size="md" />
              <Text className="text-2xl font-bold text-zinc-900 tracking-tight">HappeningNow</Text>
            </View>

            <View className="gap-4">
              <Text className="text-xl font-bold text-zinc-900">Crear cuenta</Text>

              <Input label="Email" value={email} onChangeText={setEmail}
                placeholder="tu@email.com" keyboardType="email-address"
                autoCapitalize="none" autoCorrect={false} />

              <Input label="Contraseña" value={password} onChangeText={setPassword}
                placeholder="Mínimo 6 caracteres" secureTextEntry />

              <Input label="Confirmar contraseña" value={confirmPassword} onChangeText={setConfirmPassword}
                placeholder="Repetí la contraseña" secureTextEntry />

              {error ? (
                <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <Text className="text-red-600 text-sm text-center">{error}</Text>
                </View>
              ) : null}

              <Button label="Crear cuenta" onPress={handleRegister} loading={loading} />

              <View className="flex-row justify-center py-4">
                <Text className="text-zinc-500 text-base">¿Ya tenés cuenta? </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text className="text-indigo-600 font-semibold text-base">Iniciar sesión</Text>
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
