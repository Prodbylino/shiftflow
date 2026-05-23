import { TextStyle } from 'react-native';

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderMuted: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  brand: string;
  brandMuted: string;
  success: string;
  danger: string;
  tabBar: string;
  tabBarBorder: string;
};

export const palette: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    bg: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceMuted: '#F4F4F5',
    border: '#E4E4E7',
    borderMuted: '#F1F1F2',
    text: '#09090B',
    textMuted: '#71717A',
    textSubtle: '#A1A1AA',
    brand: '#367BFD',
    brandMuted: '#E8F0FF',
    success: '#10B981',
    danger: '#EF4444',
    tabBar: '#FFFFFF',
    tabBarBorder: '#EDEDEF',
  },
  dark: {
    bg: '#09090B',
    surface: '#131316',
    surfaceMuted: '#1C1C20',
    border: '#27272A',
    borderMuted: '#1F1F22',
    text: '#FAFAFA',
    textMuted: '#A1A1AA',
    textSubtle: '#71717A',
    brand: '#5A92FE',
    brandMuted: '#142440',
    success: '#34D399',
    danger: '#F87171',
    tabBar: '#0E0E10',
    tabBarBorder: '#1F1F22',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
  '5xl': 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  full: 9999,
} as const;

export const typography: Record<string, TextStyle> = {
  display: { fontSize: 34, fontWeight: '700', letterSpacing: -0.6, lineHeight: 40 },
  h1: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4, lineHeight: 32 },
  h2: { fontSize: 20, fontWeight: '600', letterSpacing: -0.2, lineHeight: 26 },
  h3: { fontSize: 17, fontWeight: '600', letterSpacing: -0.1, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
  bodyMedium: { fontSize: 15, fontWeight: '500', lineHeight: 21 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  captionMedium: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  micro: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    lineHeight: 14,
  },
};
