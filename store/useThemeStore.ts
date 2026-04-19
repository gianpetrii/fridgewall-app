import { create } from 'zustand';
import { Appearance } from 'react-native';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import type { ColorScheme } from '@/types';

interface ThemeStore {
  colorScheme: ColorScheme;
  resolvedScheme: 'light' | 'dark';
  setColorScheme: (scheme: ColorScheme) => Promise<void>;
  toggle: () => Promise<void>;
  initialize: () => Promise<void>;
}

function resolveScheme(scheme: ColorScheme): 'light' | 'dark' {
  if (scheme === 'system') {
    return Appearance.getColorScheme() ?? 'light';
  }
  return scheme;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  colorScheme: 'system',
  resolvedScheme: resolveScheme('system'),

  initialize: async () => {
    const saved = await storage.get<ColorScheme>(STORAGE_KEYS.COLOR_SCHEME);
    const scheme = saved ?? 'system';
    set({ colorScheme: scheme, resolvedScheme: resolveScheme(scheme) });

    Appearance.addChangeListener(() => {
      const { colorScheme } = get();
      if (colorScheme === 'system') {
        set({ resolvedScheme: resolveScheme('system') });
      }
    });
  },

  setColorScheme: async (scheme) => {
    await storage.set(STORAGE_KEYS.COLOR_SCHEME, scheme);
    set({ colorScheme: scheme, resolvedScheme: resolveScheme(scheme) });
  },

  toggle: async () => {
    const { resolvedScheme, setColorScheme } = get();
    await setColorScheme(resolvedScheme === 'light' ? 'dark' : 'light');
  },
}));
