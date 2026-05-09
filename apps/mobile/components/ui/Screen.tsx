import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
};

export function Screen({ children, scroll = true, padded = true }: Props) {
  const theme = useTheme();
  const containerStyle = padded ? styles.padded : undefined;

  if (scroll) {
    return (
      <ScrollView
        style={[styles.root, { backgroundColor: theme.bg }]}
        contentContainerStyle={containerStyle}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }, containerStyle]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  padded: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['5xl'],
  },
});
