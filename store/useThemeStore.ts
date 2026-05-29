import { create } from 'zustand';
import { Appearance } from 'react-native';
import { colorScheme } from 'nativewind';
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

function syncNativeWindScheme(scheme: ColorScheme, resolved: 'light' | 'dark') {
  colorScheme.set(scheme === 'system' ? 'system' : resolved);
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  colorScheme: 'system',
  resolvedScheme: resolveScheme('system'),

  initialize: async () => {
    const saved = await storage.get<ColorScheme>(STORAGE_KEYS.COLOR_SCHEME);
    const scheme = saved ?? 'system';
    const resolved = resolveScheme(scheme);
    syncNativeWindScheme(scheme, resolved);
    set({ colorScheme: scheme, resolvedScheme: resolved });

    Appearance.addChangeListener(() => {
      const { colorScheme: currentScheme } = get();
      if (currentScheme === 'system') {
        const nextResolved = resolveScheme('system');
        syncNativeWindScheme('system', nextResolved);
        set({ resolvedScheme: nextResolved });
      }
    });
  },

  setColorScheme: async (scheme) => {
    await storage.set(STORAGE_KEYS.COLOR_SCHEME, scheme);
    const resolved = resolveScheme(scheme);
    syncNativeWindScheme(scheme, resolved);
    set({ colorScheme: scheme, resolvedScheme: resolved });
  },

  toggle: async () => {
    const { resolvedScheme, setColorScheme } = get();
    await setColorScheme(resolvedScheme === 'light' ? 'dark' : 'light');
  },
}));
