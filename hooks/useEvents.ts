import { useEffect, useMemo } from 'react';
import { useEventsStore } from '../store/useEventsStore';
import { getEventsNearLocation } from '../lib/mockEvents';
import { AppEvent } from '../types';

export function useEvents() {
  const { events, loading, fetchEvents } = useEventsStore();

  useEffect(() => {
    fetchEvents();
  }, []);

  return { events, loading, refetch: fetchEvents };
}

export function useEventsNear(lat: number | null, lng: number | null, radiusMeters = 5000) {
  const { events } = useEventsStore();

  const nearbyEvents = useMemo<AppEvent[]>(() => {
    if (lat == null || lng == null) return [];
    return events.filter((event) => {
      const distance = getDistanceMeters(lat, lng, event.lat, event.lng);
      return distance <= radiusMeters + event.radius_meters;
    });
  }, [events, lat, lng, radiusMeters]);

  return { events: nearbyEvents };
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
