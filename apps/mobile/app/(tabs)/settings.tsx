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

import { useAuth, useProfile } from '@shiftflow/shared';

import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Stack } from '@/components/ui/Stack';
import { Type } from '@/components/ui/Type';
import { spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

const REMINDER_OPTIONS: { label: string; value: number }[] = [
  { label: '5 minutes before', value: 5 },
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hours before', value: 120 },
];

const LANGUAGE_OPTIONS: { label: string; value: string }[] = [
  { label: 'English', value: 'en' },
  { label: '中文', value: 'zh' },
];

const formatReminder = (minutes: number): string => {
  const opt = REMINDER_OPTIONS.find((o) => o.value === minutes);
  if (opt) return opt.label;
  return `${minutes} minutes before`;
};

const formatLanguage = (code: string): string =>
  LANGUAGE_OPTIONS.find((o) => o.value === code)?.label ?? code;

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { profile, loading, refetch, updateProfile } = useProfile(user?.id ?? null);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You will need to sign in again to access your shifts.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  const phoneRequired = (action: string): boolean => {
    if (profile?.phone_number) return true;
    Alert.alert(
      'Phone number required',
      `Add a phone number in Profile before enabling ${action}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Profile', onPress: () => router.push('/profile') },
      ],
    );
    return false;
  };

  const toggleSms = async (value: boolean) => {
    if (value && !phoneRequired('SMS reminders')) return;
    await updateProfile({ sms_notifications_enabled: value });
  };

  const toggleVoice = async (value: boolean) => {
    if (value && !phoneRequired('voice call reminders')) return;
    await updateProfile({ voice_call_enabled: value });
  };

  const pickReminderTiming = () => {
    if (Platform.OS !== 'ios') return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Reminder timing',
        options: [...REMINDER_OPTIONS.map((o) => o.label), 'Cancel'],
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

  const pickLanguage = () => {
    if (Platform.OS !== 'ios') return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Language',
        options: [...LANGUAGE_OPTIONS.map((o) => o.label), 'Cancel'],
        cancelButtonIndex: LANGUAGE_OPTIONS.length,
        userInterfaceStyle: theme.scheme,
      },
      (idx) => {
        if (idx >= 0 && idx < LANGUAGE_OPTIONS.length) {
          updateProfile({ preferred_language: LANGUAGE_OPTIONS[idx].value });
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
    profile?.full_name?.trim() || profile?.email?.split('@')[0] || 'Profile';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <Screen onRefresh={refetch}>
        <Stack gap="3xl">
          <Type variant="display">Settings</Type>

          <Stack gap="md">
            <Type variant="micro" tone="muted">
              Account
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
                label="Sign out"
                tone="danger"
                onPress={confirmSignOut}
                isLast
              />
            </Card>
          </Stack>

          <Stack gap="md">
            <Type variant="micro" tone="muted">
              Notifications
            </Type>
            <Card padded={false}>
              <SettingRow
                icon="message-square"
                label="SMS reminders"
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
                label="Voice calls"
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
                label="Reminder timing"
                value={formatReminder(profile?.notification_minutes_before ?? 30)}
                showChevron
                onPress={pickReminderTiming}
                isLast
              />
            </Card>
          </Stack>

          <Stack gap="md">
            <Type variant="micro" tone="muted">
              Preferences
            </Type>
            <Card padded={false}>
              <SettingRow
                icon="globe"
                label="Language"
                value={formatLanguage(profile?.preferred_language ?? 'en')}
                showChevron
                onPress={pickLanguage}
                isFirst
                isLast
              />
            </Card>
          </Stack>

          <Stack gap="xs" style={{ alignItems: 'center', marginTop: spacing.xl }}>
            <Type variant="caption" tone="subtle">
              ShiftFlow · v1.0.0
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
