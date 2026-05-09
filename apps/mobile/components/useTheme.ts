import { palette, ThemeColors } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';

export function useTheme(): ThemeColors & { scheme: 'light' | 'dark' } {
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  return { ...palette[scheme], scheme };
}
