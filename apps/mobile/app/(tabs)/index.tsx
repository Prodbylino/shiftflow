import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Stack } from '@/components/ui/Stack';
import { Type } from '@/components/ui/Type';
import { radius, spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

const upcomingShifts = [
  {
    id: '1',
    org: 'Coffee Bean',
    date: 'Today',
    time: '14:00 – 22:00',
    hours: 8,
    earnings: 208,
    color: '#F59E0B',
  },
  {
    id: '2',
    org: 'Library',
    date: 'Wed, May 12',
    time: '09:00 – 17:00',
    hours: 8,
    earnings: 260,
    color: '#5E6AD2',
  },
  {
    id: '3',
    org: 'Coffee Bean',
    date: 'Fri, May 14',
    time: '06:00 – 14:00',
    hours: 8,
    earnings: 208,
    color: '#F59E0B',
  },
];

export default function DashboardScreen() {
  const theme = useTheme();
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <Screen>
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
                <Type variant="h1">24h</Type>
                <Type variant="caption" tone="muted">
                  $612 earned
                </Type>
              </Stack>
            </Card>
            <Card style={{ flex: 1 }}>
              <Stack gap="xs">
                <Type variant="micro" tone="muted">
                  This month
                </Type>
                <Type variant="h1">86h</Type>
                <Type variant="caption" tone="success">
                  +12% vs last
                </Type>
              </Stack>
            </Card>
          </Row>

          <Stack gap="md">
            <Row justify="space-between">
              <Type variant="micro" tone="muted">
                Upcoming
              </Type>
              <Type variant="captionMedium" tone="muted">
                {upcomingShifts.length} shifts
              </Type>
            </Row>

            <Stack gap="sm">
              {upcomingShifts.map((shift) => (
                <Card key={shift.id} padded={false}>
                  <View style={styles.shiftRow}>
                    <View style={[styles.colorStripe, { backgroundColor: shift.color }]} />
                    <View style={styles.shiftBody}>
                      <Row justify="space-between" align="flex-start">
                        <Stack gap="xs" style={{ flex: 1 }}>
                          <Type variant="h3">{shift.org}</Type>
                          <Type variant="caption" tone="muted">
                            {shift.date} · {shift.time}
                          </Type>
                        </Stack>
                        <Stack gap="xs" style={{ alignItems: 'flex-end' }}>
                          <Type variant="bodyMedium">${shift.earnings}</Type>
                          <Type variant="caption" tone="subtle">
                            {shift.hours}h
                          </Type>
                        </Stack>
                      </Row>
                    </View>
                  </View>
                </Card>
              ))}
            </Stack>
          </Stack>
        </Stack>
      </Screen>

      <Pressable
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
