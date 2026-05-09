import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Stack } from '@/components/ui/Stack';
import { Type } from '@/components/ui/Type';
import { radius, spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

const stats = [
  { label: 'Total hours', value: '86h' },
  { label: 'Average shift', value: '6.2h' },
  { label: 'Best day', value: 'Wed, May 6' },
  { label: 'Shifts worked', value: '14' },
];

export default function AnalyticsScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <Screen>
        <Stack gap="3xl">
          <Stack gap="xs">
            <Type variant="display">Analytics</Type>
            <Type variant="caption" tone="muted">
              May 2026
            </Type>
          </Stack>

          <Card>
            <Stack gap="md">
              <Type variant="micro" tone="muted">
                Earned this month
              </Type>
              <Type variant="display">$2,184</Type>
              <Row gap="xs">
                <Feather name="trending-up" size={14} color={theme.success} />
                <Type variant="captionMedium" tone="success">
                  +12% vs last month
                </Type>
              </Row>
            </Stack>
          </Card>

          <Stack gap="md">
            <Type variant="micro" tone="muted">
              Trend
            </Type>
            <Card style={styles.chartPlaceholder}>
              <View style={styles.chartContent}>
                <Feather name="bar-chart-2" size={32} color={theme.textSubtle} />
                <Type variant="caption" tone="subtle">
                  Chart coming soon
                </Type>
              </View>
            </Card>
          </Stack>

          <Stack gap="md">
            <Type variant="micro" tone="muted">
              Breakdown
            </Type>
            <Card padded={false}>
              {stats.map((stat, i) => (
                <Row
                  key={stat.label}
                  justify="space-between"
                  style={[
                    styles.statRow,
                    i < stats.length - 1 && {
                      borderBottomColor: theme.borderMuted,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}>
                  <Type variant="body" tone="muted">
                    {stat.label}
                  </Type>
                  <Type variant="bodyMedium">{stat.value}</Type>
                </Row>
              ))}
            </Card>
          </Stack>
        </Stack>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chartPlaceholder: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  statRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
});
