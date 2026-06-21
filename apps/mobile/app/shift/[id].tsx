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

import { useAuth, useI18n, useOrganizations, useShifts } from '@timesheetai/shared';

import { Button } from '@/components/ui/Button';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Row } from '@/components/ui/Row';
import { Stack } from '@/components/ui/Stack';
import { TextField } from '@/components/ui/TextField';
import { Type } from '@/components/ui/Type';
import { radius, spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

const CUSTOM = '__custom__';

const pad = (n: number) => String(n).padStart(2, '0');
const dateOnly = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeOnly = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

const fmtMoney = (n: number): string => {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
};

const durationHours = (start: Date, end: Date, overnight: boolean): number => {
  const s = new Date();
  s.setHours(start.getHours(), start.getMinutes(), 0, 0);
  const e = new Date(s);
  e.setHours(end.getHours(), end.getMinutes(), 0, 0);
  if (overnight || e.getTime() <= s.getTime()) e.setDate(e.getDate() + 1);
  return (e.getTime() - s.getTime()) / 3600000;
};

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
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { shifts, updateShift, deleteShift } = useShifts({ userId: user?.id ?? null });
  const { organizations } = useOrganizations(user?.id ?? null);

  const shift = shifts.find((s) => s.id === id);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customIncomeText, setCustomIncomeText] = useState('');
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
      // No organization → this is a custom (one-off) workplace; its name lives
      // in the shift title.
      setOrgId(shift.organization_id ?? CUSTOM);
      setCustomName(shift.organization_id ? '' : shift.title);
      setCustomIncomeText(shift.custom_income != null ? String(shift.custom_income) : '');
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
          <Type variant="h3">{t('shift.detail')}</Type>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.emptyState}>
          <Type variant="bodyMedium" tone="muted">
            {t('shift.notFound')}
          </Type>
        </View>
      </SafeAreaView>
    );
  }

  const isCustom = orgId === CUSTOM;
  const selectedOrg = organizations.find((o) => o.id === orgId);
  const rate = selectedOrg ? Number(selectedOrg.hourly_rate) : 0;
  const hours = durationHours(startTime, endTime, overnight);
  const parsedCustom = customIncomeText.trim() ? Number(customIncomeText) : null;
  const customIncome =
    parsedCustom != null && Number.isFinite(parsedCustom) && parsedCustom >= 0 ? parsedCustom : null;
  const estimatedIncome = customIncome != null ? customIncome : hours * rate;

  const onSave = async () => {
    setError(null);
    if (isCustom) {
      if (!customName.trim()) {
        setError(t('shift.enterName'));
        return;
      }
    } else if (!orgId) {
      setError(t('shift.pickWorkplace'));
      return;
    }
    if (customIncomeText.trim() && customIncome == null) {
      setError(t('shift.invalidIncome'));
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
      organization_id: isCustom ? null : orgId,
      title: isCustom ? customName.trim() : selectedOrg?.name ?? shift.title,
      date: dateOnly(date),
      end_date: endDateValue,
      start_time: timeOnly(startTime),
      end_time: timeOnly(endTime),
      notes: notes.trim() || null,
      custom_income: customIncome,
    });
    setSubmitting(false);
    if (ok) {
      router.back();
    } else {
      setError(t('shift.couldNotSaveChanges'));
    }
  };

  const onDelete = () => {
    Alert.alert(t('shift.deleteTitle'), t('shift.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          const ok = await deleteShift(shift.id);
          setDeleting(false);
          if (ok) {
            router.back();
          } else {
            setError(t('shift.couldNotDelete'));
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
          <Type variant="h3">{t('shift.editTitle')}</Type>
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

                <Pressable
                  onPress={() => setOrgId(CUSTOM)}
                  style={[
                    styles.orgRow,
                    {
                      backgroundColor: theme.surface,
                      borderColor: isCustom ? theme.text : theme.border,
                      borderStyle: 'dashed',
                    },
                  ]}>
                  <Row gap="md" style={{ flex: 1 }}>
                    <Feather name="plus-circle" size={16} color={theme.textMuted} />
                    <Type variant="bodyMedium">{t('shift.customWorkplace')}</Type>
                  </Row>
                  {isCustom && <Feather name="check" size={16} color={theme.text} />}
                </Pressable>
              </Stack>
            </Stack>

            {isCustom ? (
              <TextField
                label={t('shift.customName')}
                value={customName}
                onChangeText={setCustomName}
                placeholder={t('shift.customNamePlaceholder')}
              />
            ) : null}

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

            <Stack gap="sm">
              <Row justify="space-between" align="center">
                <Type variant="micro" tone="muted">
                  {t('shift.estIncome')}
                </Type>
                <Type variant="h3">${fmtMoney(estimatedIncome)}</Type>
              </Row>
              <TextField
                label={t('shift.customIncome')}
                value={customIncomeText}
                onChangeText={setCustomIncomeText}
                placeholder={isCustom ? '0.00' : fmtMoney(hours * rate)}
                keyboardType="decimal-pad"
              />
            </Stack>

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

            <Stack gap="md">
              <Button label={t('shift.saveChanges')} onPress={onSave} loading={submitting} />
              <Button
                label={t('shift.deleteShift')}
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
