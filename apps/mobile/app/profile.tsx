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

import { useAuth, useI18n, useProfile, useSupabase } from '@timesheetai/shared';

import { Button } from '@/components/ui/Button';
import { Row } from '@/components/ui/Row';
import { Stack } from '@/components/ui/Stack';
import { TextField } from '@/components/ui/TextField';
import { Type } from '@/components/ui/Type';
import { spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

// Phone verification reuses the deployed web API (same SNS-backed flow the web
// uses), authenticated with the user's Supabase access token via Bearer.
const WEB_API_BASE = 'https://timesheetai.vercel.app';

// Australian mobile → E.164. "0412345678" / "61412345678" / "+61412345678"
// all become "+61412345678" so SNS/Twilio can dial it.
function normalizeAustralianPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return '+61' + digits.slice(1);
  if (digits.startsWith('61') && digits.length === 11) return '+' + digits;
  return input.trim();
}

const isE164 = (s: string) => /^\+[1-9]\d{7,14}$/.test(s);

type PhoneStep = 'editing' | 'codeSent' | 'verified';

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const supabase = useSupabase();
  const { user } = useAuth();
  const { profile, loading, updateProfile, refetch } = useProfile(user?.id ?? null);

  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Phone verification state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('editing');
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (profile && !hydrated) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone_number ?? '');
      setPhoneStep(profile.phone_verified ? 'verified' : 'editing');
      setHydrated(true);
    }
  }, [profile, hydrated]);

  const onSave = async () => {
    setError(null);
    setSubmitting(true);
    // Phone is owned by the verification flow below — Save only touches the name.
    const ok = await updateProfile({ full_name: fullName.trim() || null });
    setSubmitting(false);
    if (ok) {
      router.back();
    } else {
      setError(t('profile.couldNotSave'));
    }
  };

  const authHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token ?? ''}`,
    };
  };

  const onSendCode = async () => {
    setPhoneError(null);
    const normalized = normalizeAustralianPhone(phone);
    setPhone(normalized);
    if (!isE164(normalized)) {
      setPhoneError(t('profile.invalidPhone'));
      return;
    }
    setPhoneBusy(true);
    try {
      const res = await fetch(`${WEB_API_BASE}/api/verify-phone/send`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ phone_number: normalized }),
      });
      if (!res.ok) throw new Error();
      setPhoneStep('codeSent');
      setOtp('');
    } catch {
      setPhoneError(t('profile.sendFailed'));
    } finally {
      setPhoneBusy(false);
    }
  };

  const onVerify = async () => {
    setPhoneError(null);
    if (!/^\d{6}$/.test(otp)) {
      setPhoneError(t('profile.codeFormat'));
      return;
    }
    setPhoneBusy(true);
    try {
      const res = await fetch(`${WEB_API_BASE}/api/verify-phone/confirm`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ otp_code: otp }),
      });
      if (!res.ok) throw new Error();
      setPhoneStep('verified');
      setOtp('');
      await refetch(); // pull phone_verified=true back into the profile
    } catch {
      setPhoneError(t('profile.wrongCode'));
    } finally {
      setPhoneBusy(false);
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

          {error ? (
            <Type variant="caption" tone="danger">
              {error}
            </Type>
          ) : null}

          <Button label={t('profile.save')} onPress={onSave} loading={submitting || loading} />

          {/* Phone verification */}
          <Stack gap="md" style={[styles.phoneCard, { borderColor: theme.borderMuted }]}>
            <Stack gap="xs">
              <TextField
                label={t('profile.phone')}
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  setPhoneError(null);
                  if (phoneStep !== 'editing') setPhoneStep('editing');
                }}
                placeholder="0412 345 678"
                keyboardType="phone-pad"
                autoComplete="tel"
                editable={!phoneBusy}
              />
              {phoneStep === 'verified' ? (
                <Row gap="xs" align="center">
                  <Feather name="check-circle" size={14} color={theme.success} />
                  <Type variant="caption" tone="success">
                    {t('profile.verified')}
                  </Type>
                </Row>
              ) : (
                <Type variant="caption" tone="muted">
                  {t('profile.verifyToRemind')}
                </Type>
              )}
            </Stack>

            {phoneStep === 'codeSent' ? (
              <Stack gap="md">
                <TextField
                  label={t('profile.enterCode')}
                  value={otp}
                  onChangeText={(v) => {
                    setOtp(v.replace(/\D/g, '').slice(0, 6));
                    setPhoneError(null);
                  }}
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!phoneBusy}
                />
                <Row gap="md">
                  <View style={{ flex: 1 }}>
                    <Button label={t('profile.verify')} onPress={onVerify} loading={phoneBusy} />
                  </View>
                  <Button
                    label={t('profile.resend')}
                    variant="ghost"
                    onPress={onSendCode}
                    disabled={phoneBusy}
                  />
                </Row>
              </Stack>
            ) : phoneStep === 'editing' ? (
              <Button label={t('profile.sendCode')} onPress={onSendCode} loading={phoneBusy} />
            ) : null}

            {phoneError ? (
              <Type variant="caption" tone="danger">
                {phoneError}
              </Type>
            ) : null}
          </Stack>
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
  phoneCard: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xl,
  },
});
