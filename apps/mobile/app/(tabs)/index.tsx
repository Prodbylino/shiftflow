import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useMemo } from 'react';

import { useAuth, useShifts, ShiftWithOrganization } from '@shiftflow/shared';

import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Stack } from '@/components/ui/Stack';
import { Type } from '@/components/ui/Type';
import { radius, spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

const HMS_TO_HOURS = (hms: string): number => {
  const [h = 0, m = 0] = hms.split(':').map(Number);
  return h + m / 60;
};

const shiftHours = (shift: ShiftWithOrganization): number => {
  let hours = HMS_TO_HOURS(shift.end_time) - HMS_TO_HOURS(shift.start_time);
  if (hours < 0) hours += 24; // overnight
  return hours;
};

const formatShiftDate = (dateStr: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return target.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatTime = (hms: string): string => hms.slice(0, 5);

const formatTimeRange = (start: string, end: string): string =>
  `${formatTime(start)} – ${formatTime(end)}`;

const startOfDayIso = (): string => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
};

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);

  const { shifts, loading, refetch } = useShifts({ userId: user?.id ?? null });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const upcoming = useMemo(() => {
    const todayIso = startOfDayIso();
    return shifts
      .filter((s) => s.date >= todayIso)
      .slice(0, 5);
  }, [shifts]);

  const stats = useMemo(() => {
    const todayIso = startOfDayIso();
    const oneWeek = new Date();
    oneWeek.setDate(oneWeek.getDate() - 7);
    const oneWeekIso = oneWeek.toISOString().split('T')[0];
    const oneMonth = new Date();
    oneMonth.setMonth(oneMonth.getMonth() - 1);
    const oneMonthIso = oneMonth.toISOString().split('T')[0];

    let weekHours = 0;
    let weekEarnings = 0;
    let monthHours = 0;
    let monthEarnings = 0;

    for (const s of shifts) {
      if (s.date > todayIso) continue;
      const h = shiftHours(s);
      const earn = h * (s.organization?.hourly_rate ?? 0);
      if (s.date >= oneWeekIso) {
        weekHours += h;
        weekEarnings += earn;
      }
      if (s.date >= oneMonthIso) {
        monthHours += h;
        monthEarnings += earn;
      }
    }

    return {
      weekHours: Math.round(weekHours),
      weekEarnings: Math.round(weekEarnings),
      monthHours: Math.round(monthHours),
      monthEarnings: Math.round(monthEarnings),
    };
  }, [shifts]);

  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <Screen onRefresh={refetch}>
        <Stack gap="3xl">
          <Stack gap="xs">
            <Type variant="caption" tone="muted">
              {dayName} · {dateStr}
            </Type>
            <Type variant="display">{greeting}</Type>
          </Stack>

          <Row gap="md">
            <Card style={{ flex: 1 }}>
              <Stack gap="xs">
                <Type variant="micro" tone="muted">
                  This week
                </Type>
                <Type variant="h1">{stats.weekHours}h</Type>
                <Type variant="caption" tone="muted">
                  ${stats.weekEarnings} earned
                </Type>
              </Stack>
            </Card>
            <Card style={{ flex: 1 }}>
              <Stack gap="xs">
                <Type variant="micro" tone="muted">
                  This month
                </Type>
                <Type variant="h1">{stats.monthHours}h</Type>
                <Type variant="caption" tone="muted">
                  ${stats.monthEarnings} earned
                </Type>
              </Stack>
            </Card>
          </Row>

          <Stack gap="md">
            <Row justify="space-between">
              <Type variant="micro" tone="muted">
                Upcoming
              </Type>
              {!loading && (
                <Type variant="captionMedium" tone="muted">
                  {upcoming.length} {upcoming.length === 1 ? 'shift' : 'shifts'}
                </Type>
              )}
            </Row>

            {loading ? (
              <Card>
                <ActivityIndicator color={theme.textMuted} />
              </Card>
            ) : upcoming.length === 0 ? (
              <Card>
                <Stack gap="xs" style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                  <Feather name="calendar" size={28} color={theme.textSubtle} />
                  <Type variant="bodyMedium" tone="muted">
                    No upcoming shifts
                  </Type>
                  <Type variant="caption" tone="subtle">
                    Tap + to add one
                  </Type>
                </Stack>
              </Card>
            ) : (
              <Stack gap="sm">
                {upcoming.map((shift) => {
                  const hours = shiftHours(shift);
                  const earnings = Math.round(hours * (shift.organization?.hourly_rate ?? 0));
                  return (
                    <Pressable
                      key={shift.id}
                      onPress={() =>
                        router.push({ pathname: '/shift/[id]', params: { id: shift.id } })
                      }
                      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                    <Card padded={false}>
                      <View style={styles.shiftRow}>
                        <View
                          style={[
                            styles.colorStripe,
                            { backgroundColor: shift.organization?.color ?? theme.brand },
                          ]}
                        />
                        <View style={styles.shiftBody}>
                          <Row justify="space-between" align="flex-start">
                            <Stack gap="xs" style={{ flex: 1 }}>
                              <Type variant="h3">{shift.organization?.name ?? shift.title}</Type>
                              <Type variant="caption" tone="muted">
                                {formatShiftDate(shift.date)} ·{' '}
                                {formatTimeRange(shift.start_time, shift.end_time)}
                              </Type>
                            </Stack>
                            <Stack gap="xs" style={{ alignItems: 'flex-end' }}>
                              <Type variant="bodyMedium">${earnings}</Type>
                              <Type variant="caption" tone="subtle">
                                {hours.toFixed(hours % 1 ? 1 : 0)}h
                              </Type>
                            </Stack>
                          </Row>
                        </View>
                      </View>
                    </Card>
                    </Pressable>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </Stack>
      </Screen>

      <Pressable
        onPress={() => router.push('/add-shift')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.text, opacity: pressed ? 0.85 : 1 },
        ]}>
        <Feather name="plus" size={22} color={theme.bg} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shiftRow: {
    flexDirection: 'row',
    minHeight: 76,
  },
  colorStripe: {
    width: 4,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  shiftBody: {
    flex: 1,
    padding: spacing.lg,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing['3xl'],
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
});
