import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { getTheme, type ColorScheme, type Theme } from './theme';

/**
 * Current theme. Screens follow the phone's light/dark setting unless `forceScheme` is passed
 * (the camera screen always passes 'dark').
 */
export function useTheme(forceScheme?: ColorScheme): Theme {
  const system = useColorScheme();
  const scheme: ColorScheme = forceScheme ?? (system === 'dark' ? 'dark' : 'light');
  return useMemo(() => getTheme(scheme), [scheme]);
}
