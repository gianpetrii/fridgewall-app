import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  Switch, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';
import { registerForPushNotifications, savePushToken } from '../../lib/notifications';
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from '../../lib/geofencing';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';

const HOURS_OPTIONS = [6, 12, 24, 48];

function SettingRow({ icon, title, subtitle, right }: {
  icon: string; title: string; subtitle?: string; right: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center px-4 py-3.5 gap-3">
      <View className="w-9 h-9 rounded-xl bg-zinc-100 items-center justify-center">
        <Text className="text-base">{icon}</Text>
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-semibold text-zinc-800">{title}</Text>
        {subtitle && <Text className="text-sm text-zinc-500">{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const [notifyProximity, setNotifyProximity] = useState(true);
  const [notifyHoursBefore, setNotifyHoursBefore] = useState(24);
  const [backgroundTracking, setBackgroundTracking] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('notification_preferences').select('*').eq('user_id', user.id).single();
      if (data) {
        setNotifyProximity(data.notify_proximity);
        setNotifyHoursBefore(data.notify_hours_before);
      }
      setLoadingPrefs(false);
    })();
  }, [user]);

  async function handleEnablePush() {
    if (!user) return;
    const token = await registerForPushNotifications();
    if (!token) {
      Alert.alert('Sin permisos', 'Habilitá las notificaciones en Configuración del sistema.');
      return;
    }
    if (token !== 'local-only') {
      await savePushToken(user.id, token);
    }
    Alert.alert('Notificaciones activadas', 'Las alertas de proximidad están listas.');
  }

  async function handleToggleBgTracking(val: boolean) {
    if (val) {
      const ok = await startBackgroundLocationTracking();
      if (!ok) { Alert.alert('Sin permisos', 'Habilitá la ubicación en segundo plano.'); return; }
    } else {
      await stopBackgroundLocationTracking();
    }
    setBackgroundTracking(val);
  }

  async function handleSave() {
    if (!user) return;
    setSavingPrefs(true);
    await supabase.from('notification_preferences').upsert(
      { user_id: user.id, notify_proximity: notifyProximity, notify_hours_before: notifyHoursBefore },
      { onConflict: 'user_id' }
    );
    setSavingPrefs(false);
    Alert.alert('Guardado');
  }

  if (loadingPrefs) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-50 items-center justify-center">
        <ActivityIndicator color="#4f46e5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <Container>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
          <View className="px-5 pt-6 pb-5">
            <Text className="text-2xl font-bold text-zinc-900">Perfil</Text>
          </View>

          <View className="mx-5 mb-6 bg-white border border-zinc-200 rounded-xl p-4 flex-row items-center gap-4">
            <View className="w-12 h-12 rounded-xl bg-indigo-100 items-center justify-center">
              <Text className="text-xl font-black text-indigo-600">
                {user?.email?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View className="gap-1 flex-1">
              <Text className="text-base font-semibold text-zinc-900">{user?.email}</Text>
              <View className="flex-row items-center gap-1.5">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <Text className="text-sm text-zinc-500">Cuenta activa</Text>
              </View>
            </View>
          </View>

          <Text className="px-5 pb-2 text-xs font-semibold text-zinc-400 uppercase tracking-widest">Notificaciones</Text>
          <View className="mx-5 bg-white border border-zinc-200 rounded-xl overflow-hidden mb-5">
            <TouchableOpacity onPress={handleEnablePush}>
              <SettingRow icon="🔔" title="Activar push" subtitle="Permitir alertas en este dispositivo"
                right={<Text className="text-zinc-400 text-xl">›</Text>} />
            </TouchableOpacity>
            <View className="h-px bg-zinc-100 mx-4" />
            <SettingRow icon="📡" title="Segundo plano" subtitle="Alertas mientras no usás la app"
              right={<Switch value={backgroundTracking} onValueChange={handleToggleBgTracking}
                trackColor={{ false: '#d4d4d8', true: '#4f46e5' }} thumbColor="#fff" />} />
            <View className="h-px bg-zinc-100 mx-4" />
            <SettingRow icon="🏃" title="Alerta de proximidad" subtitle="Cuando estás cerca de un evento"
              right={<Switch value={notifyProximity} onValueChange={setNotifyProximity}
                trackColor={{ false: '#d4d4d8', true: '#4f46e5' }} thumbColor="#fff" />} />
          </View>

          <Text className="px-5 pb-2 text-xs font-semibold text-zinc-400 uppercase tracking-widest">Anticipación</Text>
          <View className="mx-5 bg-white border border-zinc-200 rounded-xl p-4 mb-6 gap-3">
            <Text className="text-sm text-zinc-500">Notificarme con anticipación de</Text>
            <View className="flex-row gap-2">
              {HOURS_OPTIONS.map((h) => (
                <TouchableOpacity key={h} onPress={() => setNotifyHoursBefore(h)}
                  className={`flex-1 py-2.5 rounded-xl items-center border ${
                    notifyHoursBefore === h ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-zinc-300'
                  }`}>
                  <Text className={`text-sm font-bold ${notifyHoursBefore === h ? 'text-white' : 'text-zinc-600'}`}>
                    {h}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="mx-5 mb-3">
            <Button label="Guardar preferencias" onPress={handleSave} loading={savingPrefs} />
          </View>

          <TouchableOpacity className="mx-5 py-4 items-center"
            onPress={() => Alert.alert('Cerrar sesión', '¿Estás seguro?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Salir', style: 'destructive', onPress: signOut },
            ])}>
            <Text className="text-red-500 font-semibold text-base">Cerrar sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      </Container>
    </SafeAreaView>
  );
}
