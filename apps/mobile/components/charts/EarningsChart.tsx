import { StyleSheet, View } from 'react-native';

import { useI18n } from '@timesheetai/shared';
import type { ShiftWithOrganization } from '@timesheetai/shared';

import { Type } from '@/components/ui/Type';
import { spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';
import { shiftDurationHours, shiftEarnings } from '@/lib/shift';

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

// One decimal, dropped for whole numbers: 25.5 → "25.5", 26 → "26".
const fmtHours = (h: number): string => {
  const r = Math.round(h * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

export function EarningsChart({ shifts, days = 30 }: Props) {
  const theme = useTheme();
  const { t, language } = useI18n();

  const dailyEarnings = new Map<string, number>();
  const dailyHours = new Map<string, number>();
  for (const s of shifts) {
    dailyEarnings.set(s.date, (dailyEarnings.get(s.date) ?? 0) + shiftEarnings(s));
    dailyHours.set(s.date, (dailyHours.get(s.date) ?? 0) + shiftDurationHours(s));
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const series: { date: Date; earnings: number; hours: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dateKey(d);
    series.push({
      date: d,
      earnings: Math.round(dailyEarnings.get(key) ?? 0),
      hours: dailyHours.get(key) ?? 0,
    });
  }

  // Peak = highest-earning day; surface its hours alongside.
  const peak = series.reduce((acc, p) => (p.earnings > acc.earnings ? p : acc), series[0]);
  const max = peak.earnings;
  const totalEarnings = series.reduce((acc, p) => acc + p.earnings, 0);
  const totalHours = series.reduce((acc, p) => acc + p.hours, 0);

  if (totalEarnings === 0) {
    return (
      <View style={styles.empty}>
        <Type variant="caption" tone="subtle">
          {language === 'zh'
            ? `最近 ${days} 天没有收入`
            : `No earnings in the last ${days} days`}
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
          {`${days}${t('analytics.daysAgoSuffix')}`}
        </Type>
        <Type variant="micro" tone="subtle">
          {t('calendar.today')}
        </Type>
      </View>

      <View style={styles.legend}>
        <Type variant="caption" tone="muted">
          {t('analytics.peakDay')}: {fmtHours(peak.hours)}h · ${max.toLocaleString()}
        </Type>
        <Type variant="caption" tone="muted">
          {t('analytics.total')}: {fmtHours(totalHours)}h · ${totalEarnings.toLocaleString()}
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
