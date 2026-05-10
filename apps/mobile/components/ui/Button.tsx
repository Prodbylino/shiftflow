import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';

import { radius, spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';
import { Type } from '@/components/ui/Type';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  onPress?: () => void;
  label: string;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({
  onPress,
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: Props) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const bg =
    variant === 'primary'
      ? theme.text
      : variant === 'secondary'
        ? theme.surface
        : 'transparent';
  const fg =
    variant === 'primary'
      ? theme.bg
      : theme.text;
  const border =
    variant === 'secondary' ? theme.border : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Type variant="bodyMedium" style={{ color: fg }}>
          {label}
        </Type>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
