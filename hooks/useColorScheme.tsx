import { useThemeStore } from '@/store/useThemeStore';

export function useColorScheme() {
  const { resolvedScheme, colorScheme, setColorScheme, toggle } = useThemeStore();

  return {
    colorScheme: resolvedScheme,
    preference: colorScheme,
    isDark: resolvedScheme === 'dark',
    isLight: resolvedScheme === 'light',
    setColorScheme,
    toggle,
  };
}
