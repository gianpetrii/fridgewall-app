export type EventCategory = 'concert' | 'sports' | 'festival' | 'march' | 'other';

export interface AppEvent {
  id: string;
  title: string;
  category: EventCategory;
  lat: number;
  lng: number;
  radius_meters: number;
  starts_at: string;
  ends_at: string;
  venue: string;
  description?: string;
  image_url?: string;
}

export interface SavedPlace {
  id: string;
  user_id: string;
  name: string;
  lat: number;
  lng: number;
  radius_meters: number;
  active: boolean;
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
