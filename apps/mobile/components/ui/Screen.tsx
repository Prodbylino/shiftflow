import { ReactNode, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  onRefresh?: () => Promise<unknown> | void;
};

export function Screen({ children, scroll = true, padded = true, onRefresh }: Props) {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const containerStyle = padded ? styles.padded : undefined;

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (scroll) {
    return (
      <ScrollView
        style={[styles.root, { backgroundColor: theme.bg }]}
        contentContainerStyle={containerStyle}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.textMuted}
            />
          ) : undefined
        }>
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
