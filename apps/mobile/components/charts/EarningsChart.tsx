import { StyleSheet, View } from 'react-native';

import type { ShiftWithOrganization } from '@shiftflow/shared';

import { Type } from '@/components/ui/Type';
import { spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';
import { shiftEarnings } from '@/lib/shift';

type Props = {
  shifts: ShiftWithOrganization[];
  days?: number;
};

const dateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function EarningsChart({ shifts, days = 30 }: Props) {
  const theme = useTheme();

  const dailyTotals = new Map<string, number>();
  for (const s of shifts) {
    const earn = shiftEarnings(s);
    dailyTotals.set(s.date, (dailyTotals.get(s.date) ?? 0) + earn);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const series: { date: Date; earnings: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    series.push({
      date: d,
      earnings: Math.round(dailyTotals.get(dateKey(d)) ?? 0),
    });
  }

  const max = series.reduce((acc, p) => (p.earnings > acc ? p.earnings : acc), 0);
  const total = series.reduce((acc, p) => acc + p.earnings, 0);

  if (total === 0) {
    return (
      <View style={styles.empty}>
        <Type variant="caption" tone="subtle">
          No earnings in the last {days} days
        </Type>
      </View>
    );
  }

  const chartHeight = 140;
  const minBarHeight = 2; // visible nub even when 0

  return (
    <View style={styles.chartWrap}>
      <View style={styles.barsRow}>
        {series.map((point, i) => {
          const ratio = max === 0 ? 0 : point.earnings / max;
          const height = point.earnings > 0
            ? Math.max(minBarHeight, ratio * chartHeight)
            : minBarHeight;
          const isToday = i === series.length - 1;
          return (
            <View key={i} style={styles.barCol}>
              <View style={[styles.barTrack, { height: chartHeight }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: point.earnings > 0 ? theme.brand : theme.borderMuted,
                      opacity: isToday ? 1 : point.earnings > 0 ? 0.9 : 1,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={[styles.axis, { borderTopColor: theme.borderMuted }]}>
        <Type variant="micro" tone="subtle">
          {`${days}d ago`}
        </Type>
        <Type variant="micro" tone="subtle">
          Today
        </Type>
      </View>

      <View style={styles.legend}>
        <Type variant="caption" tone="muted">
          Peak day: ${max.toLocaleString()}
        </Type>
        <Type variant="caption" tone="muted">
          Total: ${total.toLocaleString()}
        </Type>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrap: {
    gap: spacing.sm,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 140,
  },
  barCol: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  empty: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
