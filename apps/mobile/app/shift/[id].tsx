import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, useOrganizations, useShifts } from '@timesheetai/shared';

import { Button } from '@/components/ui/Button';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Row } from '@/components/ui/Row';
import { Stack } from '@/components/ui/Stack';
import { TextField } from '@/components/ui/TextField';
import { Type } from '@/components/ui/Type';
import { radius, spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

const pad = (n: number) => String(n).padStart(2, '0');
const dateOnly = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeOnly = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

const parseDate = (iso: string) => new Date(iso + 'T00:00:00');
const parseTime = (hms: string) => {
  const [h = 0, m = 0] = hms.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

export default function ShiftDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { shifts, updateShift, deleteShift } = useShifts({ userId: user?.id ?? null });
  const { organizations } = useOrganizations(user?.id ?? null);

  const shift = shifts.find((s) => s.id === id);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [overnight, setOvernight] = useState(false);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (shift && !hydrated) {
      setOrgId(shift.organization_id);
      setDate(parseDate(shift.date));
      setOvernight(!!shift.end_date && shift.end_date !== shift.date);
      setStartTime(parseTime(shift.start_time));
      setEndTime(parseTime(shift.end_time));
      setNotes(shift.notes ?? '');
      setHydrated(true);
    }
  }, [shift, hydrated]);

  if (!shift) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="x" size={22} color={theme.text} />
          </Pressable>
          <Type variant="h3">Shift</Type>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.emptyState}>
          <Type variant="bodyMedium" tone="muted">
            Shift not found
          </Type>
        </View>
      </SafeAreaView>
    );
  }

  const onSave = async () => {
    setError(null);
    if (!orgId) {
      setError('Pick a workplace');
      return;
    }
    const endDateValue = overnight
      ? (() => {
          const next = new Date(date);
          next.setDate(next.getDate() + 1);
          return dateOnly(next);
        })()
      : null;
    setSubmitting(true);
    const ok = await updateShift(shift.id, {
      organization_id: orgId,
      date: dateOnly(date),
      end_date: endDateValue,
      start_time: timeOnly(startTime),
      end_time: timeOnly(endTime),
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (ok) {
      router.back();
    } else {
      setError('Could not save changes');
    }
  };

  const onDelete = () => {
    Alert.alert('Delete shift?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          const ok = await deleteShift(shift.id);
          setDeleting(false);
          if (ok) {
            router.back();
          } else {
            setError('Could not delete shift');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="x" size={22} color={theme.text} />
          </Pressable>
          <Type variant="h3">Edit shift</Type>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <Stack gap="2xl">
            <Stack gap="sm">
              <Type variant="micro" tone="muted">
                Workplace
              </Type>
              <Stack gap="sm">
                {organizations.map((org) => {
                  const selected = org.id === orgId;
                  return (
                    <Pressable
                      key={org.id}
                      onPress={() => setOrgId(org.id)}
                      style={[
                        styles.orgRow,
                        {
                          backgroundColor: theme.surface,
                          borderColor: selected ? theme.text : theme.border,
                        },
                      ]}>
                      <Row gap="md" style={{ flex: 1 }}>
                        <View style={[styles.colorDot, { backgroundColor: org.color }]} />
                        <Type variant="bodyMedium">{org.name}</Type>
                      </Row>
                      <Type variant="caption" tone="muted">
                        ${Number(org.hourly_rate).toFixed(2)}/h
                      </Type>
                      {selected && (
                        <Feather
                          name="check"
                          size={16}
                          color={theme.text}
                          style={{ marginLeft: spacing.sm }}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </Stack>
            </Stack>

            <DateTimeField label="Date" value={date} onChange={setDate} mode="date" />

            <Row gap="2xl">
              <View style={{ flex: 1 }}>
                <DateTimeField
                  label="Start time"
                  value={startTime}
                  onChange={setStartTime}
                  mode="time"
                />
              </View>
              <View style={{ flex: 1 }}>
                <DateTimeField
                  label="End time"
                  value={endTime}
                  onChange={setEndTime}
                  mode="time"
                />
              </View>
            </Row>

            <Row justify="space-between" align="center">
              <Stack gap="xs">
                <Type variant="bodyMedium">Overnight</Type>
                <Type variant="caption" tone="muted">
                  Ends the following day
                </Type>
              </Stack>
              <Switch
                value={overnight}
                onValueChange={setOvernight}
                trackColor={{ false: theme.borderMuted, true: theme.brand }}
              />
            </Row>

            <TextField
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything to remember"
              multiline
            />

            {error ? (
              <Type variant="caption" tone="danger">
                {error}
              </Type>
            ) : null}

            <Stack gap="md">
              <Button label="Save changes" onPress={onSave} loading={submitting} />
              <Button
                label="Delete shift"
                variant="ghost"
                onPress={onDelete}
                loading={deleting}
                style={{ borderColor: theme.danger }}
              />
            </Stack>
          </Stack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
