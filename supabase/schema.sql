-- HappeningNow database schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Events
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  category text not null check (category in ('concert','sports','festival','march','other')),
  size text not null check (size in ('small','medium','large','massive')) default 'medium',
  lat double precision not null,
  lng double precision not null,
  radius_meters integer not null default 800,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text not null,
  address text,
  description text,
  image_url text,
  ticket_url text,
  source text not null default 'manual',
  external_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(source, external_id)
);

alter table public.events enable row level security;

-- Lectura pública (cualquier usuario autenticado puede leer eventos)
create policy "Authenticated users can read events"
  on public.events for select
  to authenticated
  using (active = true);

-- Solo service_role puede insertar/actualizar (Edge Functions y admin)
create policy "Service role can manage events"
  on public.events for all
  to service_role
  using (true) with check (true);

create index if not exists events_starts_at_idx on public.events(starts_at);
create index if not exists events_category_idx on public.events(category);
create index if not exists events_active_idx on public.events(active);


-- Saved Places
create table if not exists public.saved_places (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  radius_meters integer not null default 500,
  active boolean not null default true,
  notify_hours_before integer not null default 24,
  created_at timestamptz not null default now()
);

-- Row Level Security for saved_places
alter table public.saved_places enable row level security;

create policy "Users can manage their own places"
  on public.saved_places
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notification Preferences
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  expo_push_token text,
  notify_hours_before integer not null default 24,
  notify_proximity boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Row Level Security for notification_preferences
alter table public.notification_preferences enable row level security;

create policy "Users can manage their own preferences"
  on public.notification_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Event Alerts Sent (deduplication)
create table if not exists public.event_alerts_sent (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  event_id text not null,
  alert_type text not null check (alert_type in ('proximity', 'scheduled')),
  sent_at timestamptz not null default now(),
  unique(user_id, event_id, alert_type)
);

-- Row Level Security for event_alerts_sent
alter table public.event_alerts_sent enable row level security;

create policy "Users can read their own alerts"
  on public.event_alerts_sent
  for select
  using (auth.uid() = user_id);

create policy "Service role can insert alerts"
  on public.event_alerts_sent
  for insert
  with check (true);

-- Index for performance
create index if not exists saved_places_user_id_idx on public.saved_places(user_id);
create index if not exists event_alerts_sent_user_id_idx on public.event_alerts_sent(user_id);
create index if not exists event_alerts_sent_lookup_idx on public.event_alerts_sent(user_id, event_id, alert_type);
