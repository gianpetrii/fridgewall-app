import { AppEvent } from '../types';

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const dayAfter = new Date(today);
dayAfter.setDate(dayAfter.getDate() + 2);

function dateAt(base: Date, hour: number, minute = 0): string {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const MOCK_EVENTS: AppEvent[] = [
  {
    id: 'evt-001',
    title: 'Recital de Coldplay',
    category: 'concert',
    lat: -34.5447,
    lng: -58.4512,
    radius_meters: 800,
    starts_at: dateAt(today, 20, 0),
    ends_at: dateAt(today, 23, 30),
    venue: 'Estadio Monumental, Núñez',
    description: 'Tour Music of the Spheres. Se esperan 80.000 personas. Intensos cortes en Av. del Libertador y accesos.',
    image_url: undefined,
  },
  {
    id: 'evt-002',
    title: 'River Plate vs Boca Juniors',
    category: 'sports',
    lat: -34.5454,
    lng: -58.4497,
    radius_meters: 1000,
    starts_at: dateAt(today, 17, 0),
    ends_at: dateAt(today, 19, 30),
    venue: 'Estadio Monumental, Núñez',
    description: 'Superclásico del fútbol argentino. Operativo de seguridad con cortes en Figueroa Alcorta, Monroe y accesos norte.',
  },
  {
    id: 'evt-003',
    title: 'Marcha Federal Universitaria',
    category: 'march',
    lat: -34.6083,
    lng: -58.3712,
    radius_meters: 600,
    starts_at: dateAt(tomorrow, 14, 0),
    ends_at: dateAt(tomorrow, 18, 0),
    venue: 'Plaza de Mayo, CABA',
    description: 'Concentración en Plaza de Mayo. Columnas desde Congreso, Once y Avellaneda. Afecta microcentro y 9 de Julio.',
  },
  {
    id: 'evt-004',
    title: 'Lollapalooza Argentina 2026',
    category: 'festival',
    lat: -34.4381,
    lng: -58.5028,
    radius_meters: 1200,
    starts_at: dateAt(tomorrow, 12, 0),
    ends_at: dateAt(tomorrow, 23, 59),
    venue: 'Hipódromo de San Isidro',
    description: '3 días de festival con más de 100 artistas. Intenso tráfico en Panamericana y accesos a San Isidro.',
  },
  {
    id: 'evt-005',
    title: 'Luna Park: La Mona Jiménez',
    category: 'concert',
    lat: -34.5992,
    lng: -58.3692,
    radius_meters: 400,
    starts_at: dateAt(tomorrow, 21, 30),
    ends_at: dateAt(dayAfter, 1, 0),
    venue: 'Luna Park, Puerto Madero',
    description: 'Sold Out. Cortes esperados en Bouchard y L.N. Alem post evento.',
  },
  {
    id: 'evt-006',
    title: 'Maratón de Buenos Aires',
    category: 'other',
    lat: -34.6158,
    lng: -58.3731,
    radius_meters: 1500,
    starts_at: dateAt(dayAfter, 7, 0),
    ends_at: dateAt(dayAfter, 13, 0),
    venue: 'Obelisco, CABA',
    description: 'Recorrido por Corrientes, Libertador y costanera. Cierre de múltiples arterias de 5am a 14pm.',
  },
  {
    id: 'evt-007',
    title: 'San Lorenzo vs Independiente',
    category: 'sports',
    lat: -34.6399,
    lng: -58.4396,
    radius_meters: 700,
    starts_at: dateAt(dayAfter, 15, 30),
    ends_at: dateAt(dayAfter, 17, 30),
    venue: 'Estadio Pedro Bidegain, Bajo Flores',
    description: 'Clásico. Operativo en Av. La Plata y accesos al estadio. Se restringe el tránsito desde las 13hs.',
  },
  {
    id: 'evt-008',
    title: 'Festival Buenos Aires Celebra Perú',
    category: 'festival',
    lat: -34.6033,
    lng: -58.3817,
    radius_meters: 300,
    starts_at: dateAt(today, 11, 0),
    ends_at: dateAt(today, 22, 0),
    venue: 'Parque Lezama, San Telmo',
    description: 'Festival cultural con gastronomía, música y danzas. Peatonalización de Brasil y Defensa.',
  },
];

export function getEventsNearLocation(
  lat: number,
  lng: number,
  radiusMeters: number
): AppEvent[] {
  return MOCK_EVENTS.filter((event) => {
    const distance = getDistanceMeters(lat, lng, event.lat, event.lng);
    return distance <= radiusMeters + event.radius_meters;
  });
}

export function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
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
