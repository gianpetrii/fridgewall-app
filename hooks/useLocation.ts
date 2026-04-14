import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface LocationState {
  coords: { latitude: number; longitude: number } | null;
  error: string | null;
  loading: boolean;
  permissionGranted: boolean;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    coords: null,
    error: null,
    loading: true,
    permissionGranted: false,
  });

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState((s) => ({ ...s, error: 'Permiso de ubicación denegado', loading: false }));
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setState((s) => ({
        ...s,
        coords: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        permissionGranted: true,
        loading: false,
      }));

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 100 },
        (loc) => {
          setState((s) => ({
            ...s,
            coords: { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
          }));
        }
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, []);

  return state;
}
