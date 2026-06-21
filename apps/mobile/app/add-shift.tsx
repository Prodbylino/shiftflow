import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const LAST_ORG_KEY = 'timesheetai_last_org_id';
const CUSTOM = '__custom__';
const CUSTOM_SAVE_COLOR = '#367BFD';

const pad = (n: number) => String(n).padStart(2, '0');

const dateOnly = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeOnly = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

const fmtMoney = (n: number): string => {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
};

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

// Hours between start and end, accounting for overnight (end on the next day).
const durationHours = (start: Date, end: Date, overnight: boolean): number => {
  const s = new Date();
  s.setHours(start.getHours(), start.getMinutes(), 0, 0);
  const e = new Date(s);
  e.setHours(end.getHours(), end.getMinutes(), 0, 0);
  if (overnight || e.getTime() <= s.getTime()) e.setDate(e.getDate() + 1);
  return (e.getTime() - s.getTime()) / 3600000;
};

export default function AddShiftScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ date?: string }>();
  const { user } = useAuth();
  const { organizations, loading: orgsLoading, createOrganization } = useOrganizations(
    user?.id ?? null,
  );
  const { createShift } = useShifts({ userId: user?.id ?? null });

  const [orgId, setOrgId] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customIncomeText, setCustomIncomeText] = useState('');
  const [date, setDate] = useState<Date>(() => parseInitialDate(params.date));
  const [overnight, setOvernight] = useState(false);
  const [startTime, setStartTime] = useState<Date>(defaultStart);
  const [endTime, setEndTime] = useState<Date>(defaultEnd);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-select a workplace: the one used for the last shift (remembered in
  // AsyncStorage), falling back to the most recently added workplace. Saves a
  // tap for the common single-job case.
  useEffect(() => {
    if (orgId || organizations.length === 0) return;
    let cancelled = false;
    (async () => {
      const lastId = await AsyncStorage.getItem(LAST_ORG_KEY);
      if (cancelled) return;
      const remembered = lastId && organizations.some((o) => o.id === lastId) ? lastId : null;
      setOrgId(remembered ?? organizations[organizations.length - 1].id);
    })();
    return () => {
      cancelled = true;
    };
  }, [organizations, orgId]);

  const isCustom = orgId === CUSTOM;
  const selectedOrg = organizations.find((o) => o.id === orgId);
  const rate = selectedOrg ? Number(selectedOrg.hourly_rate) : 0;

  const hours = durationHours(startTime, endTime, overnight);
  const parsedCustom = customIncomeText.trim() ? Number(customIncomeText) : null;
  const customIncome =
    parsedCustom != null && Number.isFinite(parsedCustom) && parsedCustom >= 0 ? parsedCustom : null;
  const estimatedIncome = customIncome != null ? customIncome : hours * rate;

  const onSubmit = async () => {
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
    const result = await createShift({
      organization_id: isCustom ? null : orgId,
      title: isCustom ? customName.trim() : selectedOrg?.name ?? 'Shift',
      date: dateOnly(date),
      end_date: endDateValue,
      start_time: timeOnly(startTime),
      end_time: timeOnly(endTime),
      notes: notes.trim() || null,
      custom_income: customIncome,
    });
    setSubmitting(false);

    if (!result) {
      setError(t('shift.couldNotSave'));
      return;
    }

    if (isCustom) {
      // Offer to keep this one-off workplace for reuse.
      const name = customName.trim();
      Alert.alert(t('shift.saveCustomTitle'), t('shift.saveCustomMessage'), [
        { text: t('shift.saveCustomNo'), style: 'cancel', onPress: () => router.back() },
        {
          text: t('shift.saveCustomYes'),
          onPress: async () => {
            await createOrganization({ name, color: CUSTOM_SAVE_COLOR, hourly_rate: 0 });
            router.back();
          },
        },
      ]);
    } else {
      if (orgId) AsyncStorage.setItem(LAST_ORG_KEY, orgId).catch(() => {});
      router.back();
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

                  {/* Custom (one-off) workplace */}
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
              )}
            </Stack>

            {isCustom ? (
              <TextField
                label={t('shift.customName')}
                value={customName}
                onChangeText={setCustomName}
                placeholder={t('shift.customNamePlaceholder')}
                autoFocus
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

            {/* Income: estimated from time, or the custom amount when entered */}
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

            <Button label={t('shift.save')} onPress={onSubmit} loading={submitting} />
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
});
