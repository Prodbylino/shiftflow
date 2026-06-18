import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback } from 'react';

import { useAuth, useI18n, useProfile, useSupabase } from '@timesheetai/shared';
import type { Language } from '@timesheetai/shared';

import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Stack } from '@/components/ui/Stack';
import { Type } from '@/components/ui/Type';
import { spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

const REMINDER_OPTIONS: { key: string; value: number }[] = [
  { key: 'settings.reminder5', value: 5 },
  { key: 'settings.reminder15', value: 15 },
  { key: 'settings.reminder30', value: 30 },
  { key: 'settings.reminder60', value: 60 },
  { key: 'settings.reminder120', value: 120 },
];

// Optional earlier second reminder. null = off.
const EARLY_REMINDER_OPTIONS: { key: string; value: number | null }[] = [
  { key: 'settings.earlyOff', value: null },
  { key: 'settings.early2h', value: 120 },
  { key: 'settings.early3h', value: 180 },
  { key: 'settings.early5h', value: 300 },
  { key: 'settings.early1d', value: 1440 },
];

// Each language is always shown in its own script, never translated.
const LANGUAGE_OPTIONS: { label: string; value: Language }[] = [
  { label: 'English', value: 'en' },
  { label: '中文', value: 'zh' },
];

const formatLanguage = (code: string): string =>
  LANGUAGE_OPTIONS.find((o) => o.value === code)?.label ?? code;

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, language, setLanguage } = useI18n();
  const supabase = useSupabase();
  const { user, signOut } = useAuth();
  const { profile, loading, refetch, updateProfile } = useProfile(user?.id ?? null);

  const formatReminder = (minutes: number): string => {
    const opt = REMINDER_OPTIONS.find((o) => o.value === minutes);
    if (opt) return t(opt.key);
    return language === 'zh' ? `提前 ${minutes} 分钟` : `${minutes} minutes before`;
  };

  const formatEarlyReminder = (minutes: number | null | undefined): string => {
    const opt = EARLY_REMINDER_OPTIONS.find((o) => o.value === (minutes ?? null));
    return t(opt ? opt.key : 'settings.earlyOff');
  };

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const confirmSignOut = () => {
    Alert.alert(t('settings.signOutTitle'), t('settings.signOutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(t('settings.deleteAccountTitle'), t('settings.deleteAccountMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAccount'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('delete_user');
          if (error) {
            Alert.alert(t('settings.deleteAccountFailed'));
            return;
          }
          // Account is gone — clear the now-invalid local session.
          await signOut();
        },
      },
    ]);
  };

  const phoneRequired = (): boolean => {
    if (profile?.phone_number) return true;
    Alert.alert(t('settings.phoneRequiredTitle'), t('settings.phoneRequiredMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.openProfile'), onPress: () => router.push('/profile') },
    ]);
    return false;
  };

  const toggleSms = async (value: boolean) => {
    if (value && !phoneRequired()) return;
    await updateProfile({ sms_notifications_enabled: value });
  };

  const toggleVoice = async (value: boolean) => {
    if (value && !phoneRequired()) return;
    await updateProfile({ voice_call_enabled: value });
  };

  const pickReminderTiming = () => {
    if (Platform.OS !== 'ios') return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t('settings.reminderTiming'),
        options: [...REMINDER_OPTIONS.map((o) => t(o.key)), t('common.cancel')],
        cancelButtonIndex: REMINDER_OPTIONS.length,
        userInterfaceStyle: theme.scheme,
      },
      (idx) => {
        if (idx >= 0 && idx < REMINDER_OPTIONS.length) {
          updateProfile({ notification_minutes_before: REMINDER_OPTIONS[idx].value });
        }
      },
    );
  };

  const pickEarlyReminder = () => {
    if (Platform.OS !== 'ios') return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t('settings.earlyReminder'),
        options: [...EARLY_REMINDER_OPTIONS.map((o) => t(o.key)), t('common.cancel')],
        cancelButtonIndex: EARLY_REMINDER_OPTIONS.length,
        userInterfaceStyle: theme.scheme,
      },
      (idx) => {
        if (idx >= 0 && idx < EARLY_REMINDER_OPTIONS.length) {
          updateProfile({ early_reminder_minutes_before: EARLY_REMINDER_OPTIONS[idx].value });
        }
      },
    );
  };

  const pickLanguage = () => {
    if (Platform.OS !== 'ios') return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t('settings.language'),
        options: [...LANGUAGE_OPTIONS.map((o) => o.label), t('common.cancel')],
        cancelButtonIndex: LANGUAGE_OPTIONS.length,
        userInterfaceStyle: theme.scheme,
      },
      (idx) => {
        if (idx >= 0 && idx < LANGUAGE_OPTIONS.length) {
          // setLanguage flips the whole UI instantly and persists to the profile.
          setLanguage(LANGUAGE_OPTIONS[idx].value);
        }
      },
    );
  };

  if (loading && !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.textMuted} />
        </View>
      </SafeAreaView>
    );
  }

  const displayName =
    profile?.full_name?.trim() || profile?.email?.split('@')[0] || t('profile.title');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <Screen onRefresh={refetch}>
        <Stack gap="3xl">
          <Type variant="display">{t('settings.title')}</Type>

          <Stack gap="md">
            <Type variant="micro" tone="muted">
              {t('settings.account')}
            </Type>
            <Card padded={false}>
              <SettingRow
                icon="user"
                label={displayName}
                value={user?.email ?? ''}
                showChevron
                onPress={() => router.push('/profile')}
                isFirst
              />
              <SettingRow
                icon="log-out"
                label={t('settings.signOut')}
                tone="danger"
                onPress={confirmSignOut}
              />
              <SettingRow
                icon="trash-2"
                label={t('settings.deleteAccount')}
                tone="danger"
                onPress={confirmDeleteAccount}
                isLast
              />
            </Card>
          </Stack>

          <Stack gap="md">
            <Type variant="micro" tone="muted">
              {t('settings.notifications')}
            </Type>
            <Card padded={false}>
              <SettingRow
                icon="message-square"
                label={t('settings.smsReminders')}
                isFirst
                rightElement={
                  <Switch
                    value={profile?.sms_notifications_enabled ?? false}
                    onValueChange={toggleSms}
                    trackColor={{ false: theme.borderMuted, true: theme.brand }}
                  />
                }
              />
              <SettingRow
                icon="phone"
                label={t('settings.voiceCalls')}
                rightElement={
                  <Switch
                    value={profile?.voice_call_enabled ?? false}
                    onValueChange={toggleVoice}
                    trackColor={{ false: theme.borderMuted, true: theme.brand }}
                  />
                }
              />
              <SettingRow
                icon="clock"
                label={t('settings.reminderTiming')}
                value={formatReminder(profile?.notification_minutes_before ?? 30)}
                showChevron
                onPress={pickReminderTiming}
              />
              <SettingRow
                icon="bell"
                label={t('settings.earlyReminder')}
                value={formatEarlyReminder(profile?.early_reminder_minutes_before)}
                showChevron
                onPress={pickEarlyReminder}
                isLast
              />
            </Card>
          </Stack>

          <Stack gap="md">
            <Type variant="micro" tone="muted">
              {t('settings.preferences')}
            </Type>
            <Card padded={false}>
              <SettingRow
                icon="globe"
                label={t('settings.language')}
                value={formatLanguage(language)}
                showChevron
                onPress={pickLanguage}
                isFirst
                isLast
              />
            </Card>
          </Stack>

          <Stack gap="xs" style={{ alignItems: 'center', marginTop: spacing.xl }}>
            <Type variant="caption" tone="subtle">
              TimesheetAI · v1.0.0
            </Type>
          </Stack>
        </Stack>
      </Screen>
    </SafeAreaView>
  );
}

type SettingRowProps = {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value?: string;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
  tone?: 'default' | 'danger';
  isFirst?: boolean;
  isLast?: boolean;
  onPress?: () => void;
};

function SettingRow({
  icon,
  label,
  value,
  showChevron,
  rightElement,
  tone = 'default',
  isLast,
  onPress,
}: SettingRowProps) {
  const theme = useTheme();
  const labelColor = tone === 'danger' ? theme.danger : theme.text;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed && onPress ? 0.6 : 1 }]}>
      <View
        style={[
          styles.settingRow,
          !isLast && {
            borderBottomColor: theme.borderMuted,
            borderBottomWidth: StyleSheet.hairlineWidth,
          },
        ]}>
        <Row gap="md" style={{ flex: 1 }}>
          <View style={[styles.iconWrap, { backgroundColor: theme.surfaceMuted }]}>
            <Feather name={icon} size={16} color={tone === 'danger' ? theme.danger : theme.text} />
          </View>
          <Stack gap="xs" style={{ flex: 1 }}>
            <Type variant="bodyMedium" style={{ color: labelColor }}>
              {label}
            </Type>
            {value && rightElement === undefined && !showChevron ? (
              <Type variant="caption" tone="muted">
                {value}
              </Type>
            ) : null}
          </Stack>
        </Row>
        <Row gap="sm">
          {value && (showChevron || rightElement !== undefined) ? (
            <Type variant="caption" tone="muted" numberOfLines={1}>
              {value}
            </Type>
          ) : null}
          {rightElement}
          {showChevron && <Feather name="chevron-right" size={16} color={theme.textSubtle} />}
        </Row>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    minHeight: 56,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
