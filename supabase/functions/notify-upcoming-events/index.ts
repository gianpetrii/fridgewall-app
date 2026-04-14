import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface SavedPlace {
  user_id: string;
  lat: number;
  lng: number;
  radius_meters: number;
  active: boolean;
}

interface NotificationPreference {
  user_id: string;
  expo_push_token: string | null;
  notify_hours_before: number;
}

interface MockEvent {
  id: string;
  title: string;
  lat: number;
  lng: number;
  radius_meters: number;
  starts_at: string;
  venue: string;
}

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// In production, this would be fetched from an events API
function getUpcomingEvents(): MockEvent[] {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return [
    {
      id: 'evt-001',
      title: 'Recital de Coldplay',
      lat: -34.5447,
      lng: -58.4512,
      radius_meters: 800,
      starts_at: new Date(tomorrow.setHours(20, 0, 0, 0)).toISOString(),
      venue: 'Estadio Monumental, Núñez',
    },
    {
      id: 'evt-003',
      title: 'Marcha Federal Universitaria',
      lat: -34.6083,
      lng: -58.3712,
      radius_meters: 600,
      starts_at: new Date(tomorrow.setHours(14, 0, 0, 0)).toISOString(),
      venue: 'Plaza de Mayo',
    },
  ];
}

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: places } = await supabase
    .from('saved_places')
    .select('user_id, lat, lng, radius_meters, active')
    .eq('active', true);

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('user_id, expo_push_token, notify_hours_before')
    .not('expo_push_token', 'is', null);

  if (!places || !prefs) {
    return new Response('No data', { status: 200 });
  }

  const events = getUpcomingEvents();
  const now = new Date();
  const messages: unknown[] = [];

  for (const pref of prefs as NotificationPreference[]) {
    const userPlaces = (places as SavedPlace[]).filter((p) => p.user_id === pref.user_id);

    for (const event of events) {
      const eventStart = new Date(event.starts_at);
      const hoursUntil = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntil < 0 || hoursUntil > pref.notify_hours_before) continue;

      const isNearPlace = userPlaces.some((place) => {
        const dist = getDistanceMeters(place.lat, place.lng, event.lat, event.lng);
        return dist <= place.radius_meters + event.radius_meters;
      });

      if (!isNearPlace) continue;

      const { error: dupError } = await supabase
        .from('event_alerts_sent')
        .insert({ user_id: pref.user_id, event_id: event.id, alert_type: 'scheduled' });

      if (dupError) continue;

      messages.push({
        to: pref.expo_push_token,
        sound: 'default',
        title: `⚡ Mañana: ${event.title}`,
        body: `Hay un evento cerca de uno de tus lugares guardados. ${event.venue} puede generar cortes de tráfico.`,
        data: { eventId: event.id },
      });
    }
  }

  if (messages.length > 0) {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  }

  return new Response(JSON.stringify({ sent: messages.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
