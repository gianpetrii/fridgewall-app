import { View } from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { Text } from '@/components/ui/text';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/useAuthStore';

export default function HomeScreen() {
  const { user } = useAuthStore();

  return (
    <Screen>
      <View className="gap-6">
        <View className="pt-4">
          <Text variant="h2">
            {user?.name ? `Hola, ${user.name.split(' ')[0]}` : 'Inicio'}
          </Text>
          <Text variant="muted" className="mt-1">
            Bienvenido a tu nueva app
          </Text>
        </View>

        <Card>
          <CardHeader>
            <View className="flex-row items-center justify-between">
              <CardTitle>Base Expo App</CardTitle>
              <Badge variant="secondary" label="v1.0" />
            </View>
            <CardDescription>
              Boilerplate base con shadcn/ui RN, Expo Router y Supabase/Firebase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <View className="gap-2">
              {[
                'shadcn/ui RN — 10 componentes base',
                'Expo Router — navegación file-based',
                'Auth completo — login, register, reset',
                'Dark/light mode persistente',
                'Forms con react-hook-form + zod',
                'Zustand — estado global',
                'Backend dual — Supabase / Firebase',
              ].map((item) => (
                <View key={item} className="flex-row items-center gap-2">
                  <View className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <Text variant="small" className="text-muted-foreground flex-1">
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      </View>
    </Screen>
  );
}
