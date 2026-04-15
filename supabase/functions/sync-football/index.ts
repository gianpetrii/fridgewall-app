// Supabase Edge Function: sync-football
// Trae partidos de fútbol argentino desde ESPN API (gratuita, sin key)
// Deploy: supabase functions deploy sync-football
// Cron sugerido: 0 7 * * * (todos los días a las 7am UTC)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Ligas ESPN a sincronizar
const ESPN_LEAGUES = [
  { slug: 'arg.1', name: 'Liga Profesional Argentina' },
  { slug: 'arg.2', name: 'Primera Nacional Argentina' },
  { slug: 'conmebol.libertadores', name: 'Copa Libertadores' },
  { slug: 'conmebol.sudamericana', name: 'Copa Sudamericana' },
  { slug: 'arg.copa_argentina', name: 'Copa Argentina' },
];

const SIZE_RADIUS: Record<string, number> = {
  small: 400, medium: 800, large: 1500, massive: 2500,
};

// Coordenadas de estadios argentinos (venueId o nombre parcial → coords)
// ESPN usa fullName del venue y ciudad
const STADIUM_COORDS: Record<string, { lat: number; lng: number; capacity: number }> = {
  // Buenos Aires
  'monumental': { lat: -34.5447, lng: -58.4512, capacity: 84567 },
  'bombonera': { lat: -34.6355, lng: -58.3647, capacity: 54000 },
  'cilindro': { lat: -34.6606, lng: -58.3731, capacity: 51389 },
  'presidente perón': { lat: -34.6606, lng: -58.3731, capacity: 51389 },
  'libertadores de américa': { lat: -34.6539, lng: -58.3726, capacity: 45161 },
  'pedro bidegain': { lat: -34.6596, lng: -58.4335, capacity: 47964 },
  'gasómetro': { lat: -34.6596, lng: -58.4335, capacity: 47964 },
  'gasometro': { lat: -34.6596, lng: -58.4335, capacity: 47964 },
  'amalfitani': { lat: -34.6359, lng: -58.5198, capacity: 49540 },
  'tomás adolfo ducó': { lat: -34.6454, lng: -58.4280, capacity: 48314 },
  'tomas adolfo duco': { lat: -34.6454, lng: -58.4280, capacity: 48314 },
  'ciudad de la plata': { lat: -34.9183, lng: -57.9894, capacity: 53000 },
  'único de la plata': { lat: -34.9183, lng: -57.9894, capacity: 53000 },
  'unico de la plata': { lat: -34.9183, lng: -57.9894, capacity: 53000 },
  'juan carmelo zerillo': { lat: -34.9083, lng: -57.9719, capacity: 30000 },
  'ciudad de lanús': { lat: -34.7004, lng: -58.3906, capacity: 46000 },
  'ciudad de lanus': { lat: -34.7004, lng: -58.3906, capacity: 46000 },
  'florencio sola': { lat: -34.7409, lng: -58.4012, capacity: 34235 },
  'diego armando maradona': { lat: -34.5966, lng: -58.4789, capacity: 26000 },
  'dellagiovanna': { lat: -34.4200, lng: -58.5789, capacity: 28000 },
  'ciudad de vicente lópez': { lat: -34.5213, lng: -58.4804, capacity: 12000 },
  'ciudad de vicente lopez': { lat: -34.5213, lng: -58.4804, capacity: 12000 },
  'grondona': { lat: -34.6800, lng: -58.3400, capacity: 16000 },
  'tomaghello': { lat: -34.7284, lng: -58.2981, capacity: 20000 },
  'eva perón': { lat: -34.5845, lng: -60.9436, capacity: 23000 },
  'eva peron': { lat: -34.5845, lng: -60.9436, capacity: 23000 },
  // Interior
  'kempes': { lat: -31.3356, lng: -64.2097, capacity: 57000 },
  'julio césar villagra': { lat: -31.3478, lng: -64.2233, capacity: 34000 },
  'julio cesar villagra': { lat: -31.3478, lng: -64.2233, capacity: 34000 },
  'gigante de arroyito': { lat: -32.9325, lng: -60.6578, capacity: 42000 },
  'marcelo bielsa': { lat: -32.9578, lng: -60.7003, capacity: 42000 },
  'gambarte': { lat: -32.9097, lng: -68.7819, capacity: 40000 },
  'monumental presidente': { lat: -26.7888, lng: -65.2125, capacity: 40000 },
  'fierro': { lat: -26.7888, lng: -65.2125, capacity: 40000 },
  'brigadier general estanislao': { lat: -31.6394, lng: -60.6981, capacity: 36000 },
  '15 de abril': { lat: -31.6189, lng: -60.7241, capacity: 22000 },
  'madre de ciudades': { lat: -27.7924, lng: -64.2615, capacity: 30000 },
  'padre ernesto martearena': { lat: -24.7925, lng: -65.4339, capacity: 23000 },
  'san juan del bicentenario': { lat: -31.5275, lng: -68.5232, capacity: 27000 },
  'malvinas argentinas': { lat: -32.8904, lng: -68.8526, capacity: 40000 },
};

function findCoords(venueName: string, city: string) {
  const haystack = (venueName + ' ' + city).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // quitar tildes

  for (const [key, val] of Object.entries(STADIUM_COORDS)) {
    const needle = key.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (haystack.includes(needle)) return val;
  }
  return null;
}

function matchSize(leagueSlug: string, homeTeam: string, awayTeam: string, capacity?: number): string {
  if (capacity) {
    if (capacity > 60000) return 'massive';
    if (capacity > 30000) return 'large';
    if (capacity > 15000) return 'medium';
    return 'small';
  }
  const isSuperclasico =
    (homeTeam.includes('River') || homeTeam.includes('Boca')) &&
    (awayTeam.includes('River') || awayTeam.includes('Boca'));
  if (isSuperclasico) return 'massive';
  if (leagueSlug.includes('libertadores') || leagueSlug.includes('sudamericana')) return 'large';
  if (leagueSlug === 'arg.1') return 'large';
  return 'medium';
}

// Genera rango de fechas: hoy + 45 días en formato YYYYMMDD-YYYYMMDD
function dateRange(): string {
  const from = new Date();
  const to = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
  return `${fmt(from)}-${fmt(to)}`;
}

Deno.serve(async () => {
  let inserted = 0, updated = 0, skipped = 0, total = 0;
  const range = dateRange();

  for (const league of ESPN_LEAGUES) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.slug}/scoreboard?limit=100&dates=${range}`;

    let data: any;
    try {
      const res = await fetch(url);
      if (!res.ok) { console.warn(`ESPN ${league.slug} HTTP ${res.status}`); continue; }
      data = await res.json();
    } catch (e) {
      console.error(`Fetch error for ${league.slug}:`, e);
      continue;
    }

    const events = data.events ?? [];
    console.log(`${league.name}: ${events.length} partidos`);
    total += events.length;

    for (const ev of events) {
      const comp = ev.competitions?.[0];
      if (!comp) { skipped++; continue; }

      const venue = comp.venue ?? {};
      const venueName: string = venue.fullName ?? '';
      const venueCity: string = venue.address?.city ?? '';
      const competitors = comp.competitors ?? [];
      const home = competitors.find((c: any) => c.homeAway === 'home');
      const away = competitors.find((c: any) => c.homeAway === 'away');

      if (!home || !away) { skipped++; continue; }

      const homeTeam: string = home.team?.displayName ?? home.team?.name ?? '';
      const awayTeam: string = away.team?.displayName ?? away.team?.name ?? '';
      const homeLogo: string = home.team?.logo ?? '';

      const coords = findCoords(venueName, venueCity);
      if (!coords) {
        console.warn(`Sin coords: "${venueName}", ${venueCity}`);
        skipped++;
        continue;
      }

      const size = matchSize(league.slug, homeTeam, awayTeam, coords.capacity);
      const startsAt = new Date(ev.date);
      const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
      const round: string = comp.series?.type ?? comp.notes?.[0]?.headline ?? league.name;

      const payload = {
        title: `${homeTeam} vs ${awayTeam}`,
        category: 'sports',
        size,
        lat: coords.lat,
        lng: coords.lng,
        radius_meters: SIZE_RADIUS[size],
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        venue: venueName || `${homeTeam} (local)`,
        address: [venueName, venueCity, 'Argentina'].filter(Boolean).join(', '),
        description: `${league.name}${round && round !== league.name ? ' · ' + round : ''}`,
        image_url: homeLogo || null,
        ticket_url: null,
        source: 'espn-football',
        external_id: String(ev.id),
        active: true,
      };

      const { error, status } = await supabase
        .from('events')
        .upsert(payload, { onConflict: 'source,external_id' });

      if (error) {
        console.error(`Upsert error ${ev.id}:`, error.message);
        skipped++;
      } else if (status === 201) {
        inserted++;
      } else {
        updated++;
      }
    }
  }

  const summary = { total, inserted, updated, skipped };
  console.log('Sync football complete:', summary);

  return new Response(JSON.stringify(summary), {
    headers: { 'Content-Type': 'application/json' },
  });
});
