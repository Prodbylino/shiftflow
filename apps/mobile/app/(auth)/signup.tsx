import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, useI18n } from '@timesheetai/shared';

import { Button } from '@/components/ui/Button';
import { Stack } from '@/components/ui/Stack';
import { TextField } from '@/components/ui/TextField';
import { Type } from '@/components/ui/Type';
import { spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

export default function SignupScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const onSubmit = async () => {
    if (submitting) return;
    setError(null);
    setConfirmation(null);
    setSubmitting(true);
    const { error: signUpError } = await signUp(email.trim(), password);
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    setConfirmation(t('auth.checkEmailConfirm'));
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Stack gap="3xl" style={styles.container}>
          <Stack gap="xs">
            <Type variant="display">{t('auth.createAccount')}</Type>
            <Type variant="body" tone="muted">
              {t('auth.signupTagline')}
            </Type>
          </Stack>

          <Stack gap="lg">
            <TextField
              label={t('auth.email')}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
            />
            <TextField
              label={t('auth.password')}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.passwordMin')}
              error={error ?? undefined}
            />
          </Stack>

          {confirmation ? (
            <Type variant="caption" tone="success">
              {confirmation}
            </Type>
          ) : null}

          <Button label={t('auth.createAccount')} onPress={onSubmit} loading={submitting} />

          <Pressable style={styles.linkRow}>
            <Type variant="caption" tone="muted">
              {t('auth.hasAccount')}{' '}
            </Type>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Type variant="captionMedium">{t('auth.signIn')}</Type>
              </Pressable>
            </Link>
          </Pressable>
        </Stack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['4xl'],
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
