import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@shiftflow/shared';

import { Button } from '@/components/ui/Button';
import { Stack } from '@/components/ui/Stack';
import { TextField } from '@/components/ui/TextField';
import { Type } from '@/components/ui/Type';
import { spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

export default function SignupScreen() {
  const theme = useTheme();
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
    setConfirmation('Check your email for a confirmation link.');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Stack gap="3xl" style={styles.container}>
          <Stack gap="xs">
            <Type variant="display">Create account</Type>
            <Type variant="body" tone="muted">
              Track shifts across all your jobs
            </Type>
          </Stack>

          <Stack gap="lg">
            <TextField
              label="Email"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
            />
            <TextField
              label="Password"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              error={error ?? undefined}
            />
          </Stack>

          {confirmation ? (
            <Type variant="caption" tone="success">
              {confirmation}
            </Type>
          ) : null}

          <Button label="Create account" onPress={onSubmit} loading={submitting} />

          <Pressable style={styles.linkRow}>
            <Type variant="caption" tone="muted">
              Already have an account?{' '}
            </Type>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Type variant="captionMedium">Sign in</Type>
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
