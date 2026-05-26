import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@timesheetai/shared';

import { Button } from '@/components/ui/Button';
import { Stack } from '@/components/ui/Stack';
import { TextField } from '@/components/ui/TextField';
import { Type } from '@/components/ui/Type';
import { spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const { error: resetError } = await resetPassword(email.trim());
    setSubmitting(false);
    if (resetError) {
      setError(resetError);
      return;
    }
    setSent(true);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Stack gap="3xl" style={styles.container}>
          <Stack gap="xs">
            <Type variant="display">Reset password</Type>
            <Type variant="body" tone="muted">
              We&apos;ll email you a reset link
            </Type>
          </Stack>

          <TextField
            label="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            error={error ?? undefined}
          />

          {sent ? (
            <Type variant="caption" tone="success">
              Check your email for the reset link.
            </Type>
          ) : null}

          <Button label="Send reset link" onPress={onSubmit} loading={submitting} />

          <Pressable style={styles.linkRow} onPress={() => router.back()}>
            <Type variant="captionMedium" tone="muted">
              Back to sign in
            </Type>
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
    alignItems: 'center',
  },
});
