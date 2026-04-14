-- Seed de eventos de ejemplo para HappeningNow
-- Ejecutar DESPUÉS de schema.sql
-- Las fechas usan NOW() + intervalos para que siempre sean próximas al ejecutar

insert into public.events (title, category, size, lat, lng, radius_meters, starts_at, ends_at, venue, address, description, source, external_id) values

('Recital de Coldplay',
 'concert', 'massive',
 -34.5447, -58.4512, 2500,
 now() + interval '2 hours', now() + interval '5 hours 30 minutes',
 'Estadio Monumental, Núñez',
 'Av. Figueroa Alcorta 7597, Núñez, CABA',
 'Tour Music of the Spheres. Se esperan 80.000 personas. Intensos cortes en Av. del Libertador y accesos.',
 'manual', 'seed-001'),

('River Plate vs Boca Juniors',
 'sports', 'massive',
 -34.5454, -58.4497, 2500,
 now() + interval '5 hours', now() + interval '7 hours 30 minutes',
 'Estadio Monumental, Núñez',
 'Av. Figueroa Alcorta 7597, Núñez, CABA',
 'Superclásico del fútbol argentino. Operativo de seguridad con cortes en Figueroa Alcorta, Monroe y accesos norte.',
 'manual', 'seed-002'),

('Marcha Federal Universitaria',
 'march', 'large',
 -34.6083, -58.3712, 1500,
 now() + interval '1 day 2 hours', now() + interval '1 day 6 hours',
 'Plaza de Mayo, CABA',
 'Balcarce 50, Monserrat, CABA',
 'Concentración en Plaza de Mayo. Columnas desde Congreso, Once y Avellaneda. Afecta microcentro y 9 de Julio.',
 'manual', 'seed-003'),

('Lollapalooza Argentina 2026',
 'festival', 'massive',
 -34.4381, -58.5028, 2500,
 now() + interval '1 day 10 hours', now() + interval '1 day 21 hours 59 minutes',
 'Hipódromo de San Isidro',
 'Av. Márquez 504, San Isidro, Buenos Aires',
 '3 días de festival con más de 100 artistas. Intenso tráfico en Panamericana y accesos a San Isidro.',
 'manual', 'seed-004'),

('Luna Park: La Mona Jiménez',
 'concert', 'medium',
 -34.5992, -58.3692, 800,
 now() + interval '1 day 19 hours 30 minutes', now() + interval '2 days 1 hour',
 'Luna Park, Puerto Madero',
 'Av. Madero 470, Puerto Madero, CABA',
 'Sold Out. Cortes esperados en Bouchard y L.N. Alem post evento.',
 'manual', 'seed-005'),

('Maratón de Buenos Aires',
 'other', 'large',
 -34.6158, -58.3731, 1500,
 now() + interval '2 days 5 hours', now() + interval '2 days 11 hours',
 'Obelisco, CABA',
 'Av. 9 de Julio y Corrientes, CABA',
 'Recorrido por Corrientes, Libertador y costanera. Cierre de múltiples arterias de 5am a 14pm.',
 'manual', 'seed-006'),

('San Lorenzo vs Independiente',
 'sports', 'large',
 -34.6399, -58.4396, 1500,
 now() + interval '2 days 13 hours 30 minutes', now() + interval '2 days 15 hours 30 minutes',
 'Estadio Pedro Bidegain, Bajo Flores',
 'Av. La Plata 1700, Bajo Flores, CABA',
 'Clásico. Operativo en Av. La Plata y accesos al estadio. Se restringe el tránsito desde las 13hs.',
 'manual', 'seed-007'),

('Festival Buenos Aires Celebra Perú',
 'festival', 'small',
 -34.6033, -58.3817, 400,
 now() + interval '3 hours', now() + interval '14 hours',
 'Parque Lezama, San Telmo',
 'Av. Brasil 1000, San Telmo, CABA',
 'Festival cultural con gastronomía, música y danzas. Peatonalización de Brasil y Defensa.',
 'manual', 'seed-008')

on conflict (source, external_id) do nothing;
