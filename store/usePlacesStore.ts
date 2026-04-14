import { create } from 'zustand';
import { SavedPlace } from '../types';
import { supabase } from '../lib/supabase';

interface PlacesState {
  places: SavedPlace[];
  loading: boolean;
  fetchPlaces: (userId: string) => Promise<void>;
  addPlace: (place: Omit<SavedPlace, 'id' | 'created_at'>) => Promise<SavedPlace | null>;
  updatePlace: (id: string, updates: Partial<SavedPlace>) => Promise<void>;
  deletePlace: (id: string) => Promise<void>;
}

export const usePlacesStore = create<PlacesState>((set, get) => ({
  places: [],
  loading: false,

  fetchPlaces: async (userId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('saved_places')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) set({ places: data as SavedPlace[] });
    set({ loading: false });
  },

  addPlace: async (place) => {
    const { data, error } = await supabase
      .from('saved_places')
      .insert(place)
      .select()
      .single();
    if (error || !data) return null;
    const newPlace = data as SavedPlace;
    set({ places: [newPlace, ...get().places] });
    return newPlace;
  },

  updatePlace: async (id, updates) => {
    const { error } = await supabase
      .from('saved_places')
      .update(updates)
      .eq('id', id);
    if (!error) {
      set({
        places: get().places.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      });
    }
  },

  deletePlace: async (id) => {
    const { error } = await supabase.from('saved_places').delete().eq('id', id);
    if (!error) {
      set({ places: get().places.filter((p) => p.id !== id) });
    }
  },
}));
