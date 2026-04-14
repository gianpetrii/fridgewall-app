import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { scheduleLocalNotification } from './notifications';
import { MOCK_EVENTS, getDistanceMeters } from './mockEvents';
import { AppEvent } from '../types';

export const LOCATION_TASK_NAME = 'background-location-task';
export const GEOFENCE_TASK_NAME = 'geofence-task';

export interface GeofenceRegion {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
}

TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Geofence task error:', error);
    return;
  }
  if (!data) return;
  const { eventType, region } = data as {
    eventType: Location.GeofencingEventType;
    region: Location.GeofencingRegion;
  };
  if (eventType === Location.GeofencingEventType.Enter) {
    const event = MOCK_EVENTS.find((e) => e.id === region.identifier);
    if (event) {
      await scheduleLocalNotification(
        `⚡ Evento cerca: ${event.title}`,
        `Entraste al radio de impacto de ${event.venue}. Posibles cortes de tráfico.`,
        { eventId: event.id }
      );
    }
  }
});

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  const location = locations[0];
  if (!location) return;

  const { latitude, longitude } = location.coords;

  for (const event of MOCK_EVENTS) {
    const distance = getDistanceMeters(latitude, longitude, event.lat, event.lng);
    if (distance <= event.radius_meters) {
      const eventStart = new Date(event.starts_at);
      const now = new Date();
      const hoursUntil = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntil >= -2 && hoursUntil <= 4) {
        await scheduleLocalNotification(
          `Evento cerca: ${event.title}`,
          `Estás a ${Math.round(distance)}m de ${event.venue}. Posibles cortes de tráfico.`,
          { eventId: event.id }
        );
      }
    }
  }
});

export async function startBackgroundLocationTracking() {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') return false;

  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (!isRegistered) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5 * 60 * 1000,
      distanceInterval: 200,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'HappeningNow activo',
        notificationBody: 'Monitoreando eventos cercanos',
        notificationColor: '#6366f1',
      },
    });
  }
  return true;
}

export async function stopBackgroundLocationTracking() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

export async function startGeofencingForEvents(events: AppEvent[]) {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') return false;

  const regions: GeofenceRegion[] = events.map((event) => ({
    identifier: event.id,
    latitude: event.lat,
    longitude: event.lng,
    radius: event.radius_meters,
    notifyOnEnter: true,
    notifyOnExit: false,
  }));

  if (regions.length === 0) return false;

  await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
  return true;
}

export async function stopGeofencing() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
  if (isRegistered) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
  }
}
