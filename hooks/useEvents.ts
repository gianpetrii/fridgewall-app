import { useMemo } from 'react';
import { MOCK_EVENTS, getEventsNearLocation } from '../lib/mockEvents';
import { AppEvent } from '../types';

export function useEvents() {
  return { events: MOCK_EVENTS };
}

export function useEventsNear(lat: number | null, lng: number | null, radiusMeters = 5000) {
  const nearbyEvents = useMemo<AppEvent[]>(() => {
    if (lat == null || lng == null) return [];
    return getEventsNearLocation(lat, lng, radiusMeters);
  }, [lat, lng, radiusMeters]);

  return { events: nearbyEvents };
}
