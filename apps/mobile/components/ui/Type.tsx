import { Text as RNText, TextProps, TextStyle } from 'react-native';

import { typography } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

type Variant = keyof typeof typography;
type Tone = 'default' | 'muted' | 'subtle' | 'brand' | 'danger' | 'success';

type Props = TextProps & {
  variant?: Variant;
  tone?: Tone;
  style?: TextStyle | TextStyle[];
};

export function Type({ variant = 'body', tone = 'default', style, ...rest }: Props) {
  const theme = useTheme();
  const color = (() => {
    switch (tone) {
      case 'muted':
        return theme.textMuted;
      case 'subtle':
        return theme.textSubtle;
      case 'brand':
        return theme.brand;
      case 'danger':
        return theme.danger;
      case 'success':
        return theme.success;
      default:
        return theme.text;
    }
  })();

  return <RNText style={[typography[variant], { color }, style]} {...rest} />;
}
