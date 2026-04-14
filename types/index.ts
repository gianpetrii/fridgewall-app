export type EventCategory = 'concert' | 'sports' | 'festival' | 'march' | 'other';

// Tamaño estimado del evento → determina el radio de impacto
// small: <2k personas → 400m | medium: 2k-15k → 800m | large: 15k-50k → 1500m | massive: >50k → 2500m
export type EventSize = 'small' | 'medium' | 'large' | 'massive';

export const EVENT_SIZE_LABELS: Record<EventSize, string> = {
  small: 'Pequeño',
  medium: 'Mediano',
  large: 'Grande',
  massive: 'Masivo',
};

export const EVENT_SIZE_ATTENDANCE: Record<EventSize, string> = {
  small: 'Hasta 2.000 personas',
  medium: '2.000 – 15.000 personas',
  large: '15.000 – 50.000 personas',
  massive: 'Más de 50.000 personas',
};

export const EVENT_SIZE_RADIUS: Record<EventSize, number> = {
  small: 400,
  medium: 800,
  large: 1500,
  massive: 2500,
};

export interface AppEvent {
  id: string;
  title: string;
  category: EventCategory;
  size: EventSize;
  lat: number;
  lng: number;
  radius_meters: number;
  starts_at: string;
  ends_at: string;
  venue: string;
  address?: string;
  description?: string;
  image_url?: string;
  ticket_url?: string;
  source?: string;
}

export interface SavedPlace {
  id: string;
  user_id: string;
  name: string;
  lat: number;
  lng: number;
  radius_meters: number;
  active: boolean;
  notify_hours_before: number;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  expo_push_token: string | null;
  notify_hours_before: number;
  notify_proximity: boolean;
}

export interface EventAlertSent {
  id: string;
  user_id: string;
  event_id: string;
  alert_type: 'proximity' | 'scheduled';
  sent_at: string;
}
