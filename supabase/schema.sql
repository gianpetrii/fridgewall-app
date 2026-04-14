-- HappeningNow database schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Saved Places
create table if not exists public.saved_places (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  radius_meters integer not null default 500,
  active boolean not null default true,
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
