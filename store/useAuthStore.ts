import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { AuthState, User, Session } from '@/types';

// ─── To switch to Firebase ────────────────────────────────────────────────────
// 1. Import from '@/lib/firebase' instead of '@/lib/supabase'
// 2. Replace the supabase.auth.* calls with the firebase equivalents
// ─────────────────────────────────────────────────────────────────────────────

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const user: User = {
          id: data.session.user.id,
          email: data.session.user.email ?? '',
          name: data.session.user.user_metadata?.name,
          avatarUrl: data.session.user.user_metadata?.avatar_url,
        };
        const session: Session = {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          user,
        };
        set({ user, session });
      }
    } finally {
      set({ isLoading: false, isInitialized: true });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const user: User = {
          id: session.user.id,
          email: session.user.email ?? '',
          name: session.user.user_metadata?.name,
          avatarUrl: session.user.user_metadata?.avatar_url,
        };
        set({
          user,
          session: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
            user,
          },
        });
      } else {
        set({ user: null, session: null });
      }
    });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw new Error(error.message);
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null });
    } finally {
      set({ isLoading: false });
    }
  },

  resetPassword: async (email) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw new Error(error.message);
    } finally {
      set({ isLoading: false });
    }
  },

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
}));
