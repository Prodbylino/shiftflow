import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, useI18n, useProfile } from '@timesheetai/shared';

import { Button } from '@/components/ui/Button';
import { Stack } from '@/components/ui/Stack';
import { TextField } from '@/components/ui/TextField';
import { Type } from '@/components/ui/Type';
import { spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const { profile, loading, updateProfile } = useProfile(user?.id ?? null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (profile && !hydrated) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone_number ?? '');
      setHydrated(true);
    }
  }, [profile, hydrated]);

  const onSave = async () => {
    setError(null);
    setSubmitting(true);
    const ok = await updateProfile({
      full_name: fullName.trim() || null,
      phone_number: phone.trim() || null,
    });
    setSubmitting(false);
    if (ok) {
      router.back();
    } else {
      setError(t('profile.couldNotSave'));
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
          <Type variant="h3">{t('profile.title')}</Type>
          <View style={{ width: 22 }} />
        </View>

        <Stack gap="2xl" style={styles.body}>
          <TextField
            label={t('auth.email')}
            value={user?.email ?? ''}
            editable={false}
            placeholderTextColor={theme.textSubtle}
          />

          <TextField
            label={t('profile.fullName')}
            value={fullName}
            onChangeText={setFullName}
            placeholder={t('profile.namePlaceholder')}
            autoCapitalize="words"
            autoComplete="name"
          />

          <Stack gap="xs">
            <TextField
              label={t('profile.phone')}
              value={phone}
              onChangeText={setPhone}
              placeholder="+61 4XX XXX XXX"
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            {profile?.phone_verified ? (
              <Type variant="caption" tone="success">
                {t('profile.verified')}
              </Type>
            ) : phone ? (
              <Type variant="caption" tone="muted">
                {t('profile.verifyComingSoon')}
              </Type>
            ) : null}
          </Stack>

          {error ? (
            <Type variant="caption" tone="danger">
              {error}
            </Type>
          ) : null}

          <Button label={t('profile.save')} onPress={onSave} loading={submitting || loading} />
        </Stack>
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
  },
});
