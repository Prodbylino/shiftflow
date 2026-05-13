import Feather from '@expo/vector-icons/Feather';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { useAuth } from '@shiftflow/shared';

import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Stack } from '@/components/ui/Stack';
import { Type } from '@/components/ui/Type';
import { spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

export default function SettingsScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You will need to sign in again to access your shifts.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <Screen>
        <Stack gap="3xl">
          <Type variant="display">Settings</Type>

          <Stack gap="md">
            <Type variant="micro" tone="muted">
              Account
            </Type>
            <Card padded={false}>
              <SettingRow
                icon="user"
                label="Profile"
                value={user?.email ?? '—'}
                showChevron
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
                    value={smsEnabled}
                    onValueChange={setSmsEnabled}
                    trackColor={{ false: theme.borderMuted, true: theme.brand }}
                  />
                }
              />
              <SettingRow
                icon="phone"
                label="Voice calls"
                rightElement={
                  <Switch
                    value={voiceEnabled}
                    onValueChange={setVoiceEnabled}
                    trackColor={{ false: theme.borderMuted, true: theme.brand }}
                  />
                }
              />
              <SettingRow
                icon="clock"
                label="Reminder timing"
                value="30 min before"
                showChevron
                isLast
              />
            </Card>
          </Stack>

          <Stack gap="md">
            <Type variant="micro" tone="muted">
              Preferences
            </Type>
            <Card padded={false}>
              <SettingRow icon="globe" label="Language" value="English" showChevron isFirst />
              <SettingRow icon="moon" label="Theme" value="System" showChevron isLast />
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
  isFirst,
  isLast,
  onPress,
}: SettingRowProps) {
  const theme = useTheme();
  const labelColor = tone === 'danger' ? theme.danger : theme.text;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
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
          <Type variant="bodyMedium" style={{ color: labelColor }}>
            {label}
          </Type>
        </Row>
        <Row gap="sm">
          {value && (
            <Type variant="caption" tone="muted">
              {value}
            </Type>
          )}
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
});
