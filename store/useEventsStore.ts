import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { AppEvent } from '../types';
import { MOCK_EVENTS } from '../lib/mockEvents';

interface EventsState {
  events: AppEvent[];
  loading: boolean;
  error: string | null;
  fetchEvents: () => Promise<void>;
}

export const useEventsStore = create<EventsState>((set) => ({
  events: [],
  loading: false,
  error: null,

  fetchEvents: async () => {
    set({ loading: true, error: null });
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('active', true)
        .gte('ends_at', now)
        .order('starts_at', { ascending: true });

      if (error) throw error;

      set({ events: data as AppEvent[], loading: false });
    } catch (err) {
      // Fallback a mocks si Supabase falla o la tabla no existe aún
      console.warn('[EventsStore] Supabase unavailable, using mock events:', err);
      set({ events: MOCK_EVENTS, loading: false, error: null });
    }
  },
}));
