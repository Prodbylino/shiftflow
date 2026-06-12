import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useMemo } from 'react';

import { useAuth, useI18n, useShifts } from '@timesheetai/shared';

import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Stack } from '@/components/ui/Stack';
import { Type } from '@/components/ui/Type';
import { EarningsChart } from '@/components/charts/EarningsChart';
import { spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';
import { shiftDurationHours, shiftEarnings } from '@/lib/shift';

const monthRange = (offsetMonths: number) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};

export default function AnalyticsScreen() {
  const theme = useTheme();
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { shifts, loading, refetch } = useShifts({ userId: user?.id ?? null });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );
  const todayIso = new Date().toISOString().split('T')[0];

  const analytics = useMemo(() => {
    const thisMonth = monthRange(0);
    const lastMonth = monthRange(-1);

    let thisMonthHours = 0;
    let thisMonthEarnings = 0;
    let thisMonthShifts = 0;
    let lastMonthEarnings = 0;

    for (const s of shifts) {
      if (s.date > todayIso) continue;
      const h = shiftDurationHours(s);
      const earn = shiftEarnings(s);

      if (s.date >= thisMonth.start && s.date <= thisMonth.end) {
        thisMonthHours += h;
        thisMonthEarnings += earn;
        thisMonthShifts += 1;
      }
      if (s.date >= lastMonth.start && s.date <= lastMonth.end) {
        lastMonthEarnings += earn;
      }
    }

    const avgShift = thisMonthShifts > 0 ? thisMonthHours / thisMonthShifts : 0;
    const change =
      lastMonthEarnings > 0
        ? Math.round(((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100)
        : null;

    return {
      thisMonthHours: Math.round(thisMonthHours),
      thisMonthEarnings: Math.round(thisMonthEarnings),
      thisMonthShifts,
      avgShift: avgShift.toFixed(avgShift % 1 ? 1 : 0),
      change,
    };
  }, [shifts, todayIso]);

  const monthLabel = new Date().toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <Screen onRefresh={refetch}>
        <Stack gap="3xl">
          <Stack gap="xs">
            <Type variant="display">{t('analytics.title')}</Type>
            <Type variant="caption" tone="muted">
              {monthLabel}
            </Type>
          </Stack>

          <Card>
            <Stack gap="md">
              <Type variant="micro" tone="muted">
                {t('analytics.earnedThisMonth')}
              </Type>
              <Type variant="display">${analytics.thisMonthEarnings.toLocaleString()}</Type>
              {analytics.change !== null ? (
                <Row gap="xs">
                  <Feather
                    name={analytics.change >= 0 ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={analytics.change >= 0 ? theme.success : theme.danger}
                  />
                  <Type
                    variant="captionMedium"
                    tone={analytics.change >= 0 ? 'success' : 'danger'}>
                    {analytics.change >= 0 ? '+' : ''}
                    {analytics.change}% {t('analytics.vsLastMonth')}
                  </Type>
                </Row>
              ) : (
                <Type variant="caption" tone="subtle">
                  {t('analytics.noLastMonth')}
                </Type>
              )}
            </Stack>
          </Card>

          <Stack gap="md">
            <Type variant="micro" tone="muted">
              {t('analytics.last30Days')}
            </Type>
            <Card>
              <EarningsChart shifts={shifts} days={30} />
            </Card>
          </Stack>

          <Stack gap="md">
            <Type variant="micro" tone="muted">
              {t('analytics.breakdown')}
            </Type>
            <Card padded={false}>
              {loading ? (
                <View style={{ padding: spacing.xl }}>
                  <ActivityIndicator color={theme.textMuted} />
                </View>
              ) : (
                <>
                  <BreakdownRow label={t('analytics.totalHours')} value={`${analytics.thisMonthHours}h`} />
                  <BreakdownRow label={t('analytics.avgShift')} value={`${analytics.avgShift}h`} />
                  <BreakdownRow
                    label={t('analytics.shiftsWorked')}
                    value={String(analytics.thisMonthShifts)}
                    isLast
                  />
                </>
              )}
            </Card>
          </Stack>
        </Stack>
      </Screen>
    </SafeAreaView>
  );
}

function BreakdownRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  const theme = useTheme();
  return (
    <Row
      justify="space-between"
      style={[
        styles.statRow,
        !isLast && {
          borderBottomColor: theme.borderMuted,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}>
      <Type variant="body" tone="muted">
        {label}
      </Type>
      <Type variant="bodyMedium">{value}</Type>
    </Row>
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
