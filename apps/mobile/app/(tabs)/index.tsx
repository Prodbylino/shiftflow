import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useMemo, useState } from 'react';

import { useAuth, useI18n, useOrganizations, useShifts } from '@timesheetai/shared';

import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Stack } from '@/components/ui/Stack';
import { SwipeableRow } from '@/components/ui/SwipeableRow';
import { Type } from '@/components/ui/Type';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { MonthHeader } from '@/components/calendar/MonthHeader';
import { addMonths, dateKey, dateLocale, isSameDay } from '@/components/calendar/utils';
import { radius, spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';
import { shiftDurationHours, shiftEarnings } from '@/lib/shift';

const formatTime = (hms: string): string => hms.slice(0, 5);
const formatTimeRange = (
  start: string,
  end: string,
  overnight: boolean,
  nextDayLabel: string,
): string => `${formatTime(start)} – ${formatTime(end)}${overnight ? ` ${nextDayLabel}` : ''}`;

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, language } = useI18n();
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);

  const [month, setMonth] = useState<Date>(today);
  const [selected, setSelected] = useState<Date>(today);

  const { shifts, loading, refetch, deleteShift } = useShifts({ userId: user?.id ?? null });
  const { organizations } = useOrganizations(user?.id ?? null);
  const hasWorkplaces = organizations.length > 0;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const goAddShift = () => {
    if (!hasWorkplaces) {
      router.push('/add-workplace');
      return;
    }
    router.push({ pathname: '/add-shift', params: { date: selectedKey } });
  };

  const selectedKey = dateKey(selected);
  const dayShifts = useMemo(
    () => shifts.filter((s) => s.date === selectedKey),
    [shifts, selectedKey],
  );

  const selectedLabel = useMemo(() => {
    if (isSameDay(selected, today)) return t('calendar.today');
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (isSameDay(selected, tomorrow)) return t('dash.tomorrow');
    return selected.toLocaleDateString(dateLocale(language), {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, [selected, today, t, language]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <Screen onRefresh={refetch}>
        <Stack gap="xl">
          <MonthHeader
            date={month}
            onPrev={() => setMonth((m) => addMonths(m, -1))}
            onNext={() => setMonth((m) => addMonths(m, 1))}
            onToday={() => {
              setMonth(today);
              setSelected(today);
            }}
          />

          <MonthGrid
            month={month}
            selected={selected}
            shifts={shifts}
            onSelectDay={setSelected}
          />

          <Stack gap="md">
            <Row justify="space-between">
              <Type variant="micro" tone="muted">
                {selectedLabel}
              </Type>
              {dayShifts.length > 0 && (
                <Type variant="captionMedium" tone="muted">
                  {dayShifts.length} {dayShifts.length === 1 ? t('dash.shift') : t('dash.shifts')}
                </Type>
              )}
            </Row>

            {loading ? (
              <Card>
                <ActivityIndicator color={theme.textMuted} />
              </Card>
            ) : dayShifts.length === 0 ? (
              <Card>
                <Stack gap="xs" style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                  <Feather
                    name={hasWorkplaces ? 'calendar' : 'briefcase'}
                    size={28}
                    color={theme.textSubtle}
                  />
                  <Type variant="bodyMedium" tone="muted">
                    {hasWorkplaces ? t('dash.noShifts') : t('dash.noWorkplaces')}
                  </Type>
                  <Type variant="caption" tone="subtle">
                    {hasWorkplaces ? t('dash.tapToAddShift') : t('dash.tapToAddWorkplace')}
                  </Type>
                </Stack>
              </Card>
            ) : (
              <Stack gap="sm">
                {dayShifts.map((shift) => {
                  const hours = shiftDurationHours(shift);
                  const earnings = Math.round(shiftEarnings(shift));
                  const overnight = !!shift.end_date && shift.end_date !== shift.date;
                  return (
                    <SwipeableRow
                      key={shift.id}
                      confirmTitle={t('shift.deleteTitle')}
                      confirmMessage={t('shift.deleteMessage')}
                      onDelete={() => deleteShift(shift.id)}>
                      <Pressable
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
                                  <Type variant="h3">
                                    {shift.organization?.name ?? shift.title}
                                  </Type>
                                  <Type variant="caption" tone="muted">
                                    {formatTimeRange(
                                      shift.start_time,
                                      shift.end_time,
                                      overnight,
                                      t('shift.nextDay'),
                                    )}
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
                    </SwipeableRow>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </Stack>
      </Screen>

      <Pressable
        onPress={goAddShift}
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
