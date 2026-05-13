import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { radius, spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
};

export function Card({ children, style, padded = true }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.borderMuted,
        },
        padded && styles.padded,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  padded: {
    padding: spacing.lg,
  },
});
