// Supabase Edge Function: sync-ticketmaster
// Corre diariamente vía cron y trae eventos de Argentina desde Ticketmaster API
// Deploy: supabase functions deploy sync-ticketmaster
// Cron: supabase functions schedule sync-ticketmaster "0 6 * * *" (todos los días a las 6am UTC)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TICKETMASTER_API_KEY = Deno.env.get('TICKETMASTER_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Mapeo de clasificaciones Ticketmaster → categorías de HappeningNow
function mapCategory(segment: string, genre: string): string {
  const seg = segment.toLowerCase();
  const gen = genre.toLowerCase();
  if (seg.includes('music') || gen.includes('music')) return 'concert';
  if (seg.includes('sport') || gen.includes('football') || gen.includes('soccer')) return 'sports';
  if (gen.includes('festival')) return 'festival';
  return 'other';
}

// Estima el tamaño según capacidad del venue o precio
function estimateSize(capacity?: number): string {
  if (!capacity) return 'medium';
  if (capacity > 40000) return 'massive';
  if (capacity > 10000) return 'large';
  if (capacity > 2000) return 'medium';
  return 'small';
}

const SIZE_RADIUS: Record<string, number> = {
  small: 400, medium: 800, large: 1500, massive: 2500,
};

Deno.serve(async () => {
  if (!TICKETMASTER_API_KEY) {
    return new Response('TICKETMASTER_API_KEY not set', { status: 500 });
  }

  // Traemos eventos en Argentina para los próximos 30 días
  const startDate = new Date().toISOString().replace('.000', '');
  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('.000', '');

  const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
  url.searchParams.set('apikey', TICKETMASTER_API_KEY);
  url.searchParams.set('countryCode', 'AR');
  url.searchParams.set('size', '50');
  url.searchParams.set('startDateTime', startDate);
  url.searchParams.set('endDateTime', endDate);
  url.searchParams.set('sort', 'date,asc');

  const response = await fetch(url.toString());
  const data = await response.json();

  const tmEvents = data._embedded?.events ?? [];
  console.log(`Ticketmaster: ${tmEvents.length} eventos encontrados`);

  let inserted = 0, updated = 0, skipped = 0;

  for (const ev of tmEvents) {
    const venue = ev._embedded?.venues?.[0];
    if (!venue?.location?.latitude) { skipped++; continue; }

    const lat = parseFloat(venue.location.latitude);
    const lng = parseFloat(venue.location.longitude);
    const category = mapCategory(
      ev.classifications?.[0]?.segment?.name ?? '',
      ev.classifications?.[0]?.genre?.name ?? ''
    );
    const size = estimateSize(venue.capacity);

    const payload = {
      title: ev.name,
      category,
      size,
      lat,
      lng,
      radius_meters: SIZE_RADIUS[size],
      starts_at: ev.dates?.start?.dateTime ?? ev.dates?.start?.localDate + 'T20:00:00Z',
      ends_at: new Date(
        new Date(ev.dates?.start?.dateTime ?? ev.dates?.start?.localDate + 'T20:00:00Z').getTime() + 3 * 60 * 60 * 1000
      ).toISOString(),
      venue: venue.name,
      address: [venue.address?.line1, venue.city?.name].filter(Boolean).join(', '),
      description: ev.info ?? ev.pleaseNote ?? null,
      image_url: ev.images?.find((i: any) => i.ratio === '16_9' && i.width > 500)?.url ?? null,
      ticket_url: ev.url ?? null,
      source: 'ticketmaster',
      external_id: ev.id,
      active: true,
    };

    const { error, status } = await supabase
      .from('events')
      .upsert(payload, { onConflict: 'source,external_id' });

    if (error) { console.error('Upsert error:', error.message); skipped++; }
    else if (status === 201) inserted++;
    else updated++;
  }

  const summary = { total: tmEvents.length, inserted, updated, skipped };
  console.log('Sync complete:', summary);

  return new Response(JSON.stringify(summary), {
    headers: { 'Content-Type': 'application/json' },
  });
});
