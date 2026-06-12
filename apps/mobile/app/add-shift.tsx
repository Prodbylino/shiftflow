import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, useI18n, useOrganizations, useShifts } from '@timesheetai/shared';

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

const defaultStart = () => {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
};

const defaultEnd = () => {
  const d = new Date();
  d.setHours(17, 0, 0, 0);
  return d;
};

const parseInitialDate = (raw: string | undefined): Date => {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date();
  const parsed = new Date(raw + 'T00:00:00');
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export default function AddShiftScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ date?: string }>();
  const { user } = useAuth();
  const { organizations, loading: orgsLoading } = useOrganizations(user?.id ?? null);
  const { createShift } = useShifts({ userId: user?.id ?? null });

  const [orgId, setOrgId] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(() => parseInitialDate(params.date));
  const [overnight, setOvernight] = useState(false);
  const [startTime, setStartTime] = useState<Date>(defaultStart);
  const [endTime, setEndTime] = useState<Date>(defaultEnd);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);

    if (!orgId) {
      setError(t('shift.pickWorkplace'));
      return;
    }

    const org = organizations.find((o) => o.id === orgId);
    const endDateValue = overnight
      ? (() => {
          const next = new Date(date);
          next.setDate(next.getDate() + 1);
          return dateOnly(next);
        })()
      : null;
    setSubmitting(true);
    const result = await createShift({
      organization_id: orgId,
      title: org?.name ?? 'Shift',
      date: dateOnly(date),
      end_date: endDateValue,
      start_time: timeOnly(startTime),
      end_time: timeOnly(endTime),
      notes: notes.trim() || null,
    });
    setSubmitting(false);

    if (result) {
      router.back();
    } else {
      setError(t('shift.couldNotSave'));
    }
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
          <Type variant="h3">{t('shift.new')}</Type>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <Stack gap="2xl">
            <Stack gap="sm">
              <Type variant="micro" tone="muted">
                {t('shift.workplace')}
              </Type>
              {orgsLoading ? (
                <Type variant="caption" tone="muted">
                  {t('common.loading')}
                </Type>
              ) : organizations.length === 0 ? (
                <Pressable
                  onPress={() => {
                    router.back();
                    setTimeout(() => router.push('/add-workplace'), 100);
                  }}
                  style={[styles.emptyOrgs, { borderColor: theme.border }]}>
                  <Type variant="bodyMedium" tone="muted">
                    {t('shift.addWorkplaceFirst')}
                  </Type>
                </Pressable>
              ) : (
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
              )}
            </Stack>

            <DateTimeField label={t('shift.date')} value={date} onChange={setDate} mode="date" />

            <Row gap="2xl">
              <View style={{ flex: 1 }}>
                <DateTimeField
                  label={t('shift.startTime')}
                  value={startTime}
                  onChange={setStartTime}
                  mode="time"
                />
              </View>
              <View style={{ flex: 1 }}>
                <DateTimeField
                  label={t('shift.endTime')}
                  value={endTime}
                  onChange={setEndTime}
                  mode="time"
                />
              </View>
            </Row>

            <Row justify="space-between" align="center">
              <Stack gap="xs">
                <Type variant="bodyMedium">{t('shift.overnight')}</Type>
                <Type variant="caption" tone="muted">
                  {t('shift.overnightHint')}
                </Type>
              </Stack>
              <Switch
                value={overnight}
                onValueChange={setOvernight}
                trackColor={{ false: theme.borderMuted, true: theme.brand }}
              />
            </Row>

            <TextField
              label={t('shift.notes')}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('shift.notesPlaceholder')}
              multiline
            />

            {error ? (
              <Type variant="caption" tone="danger">
                {error}
              </Type>
            ) : null}

            <Button
              label={t('shift.save')}
              onPress={onSubmit}
              loading={submitting}
              disabled={organizations.length === 0}
            />
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
  emptyOrgs: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
});
