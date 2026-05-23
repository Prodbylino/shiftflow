import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, useOrganizations } from '@shiftflow/shared';

import { Button } from '@/components/ui/Button';
import { Row } from '@/components/ui/Row';
import { Stack } from '@/components/ui/Stack';
import { TextField } from '@/components/ui/TextField';
import { Type } from '@/components/ui/Type';
import { spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

const PRESET_COLORS = [
  '#367BFD',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#EC4899',
  '#84CC16',
];

export default function AddWorkplaceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { createOrganization } = useOrganizations(user?.id ?? null);

  const [name, setName] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    const trimmedName = name.trim();
    const rateNum = parseFloat(hourlyRate);

    if (!trimmedName) {
      setError('Name is required');
      return;
    }
    if (!Number.isFinite(rateNum) || rateNum <= 0) {
      setError('Enter a valid hourly rate');
      return;
    }

    setSubmitting(true);
    const result = await createOrganization({
      name: trimmedName,
      color,
      hourly_rate: rateNum,
    });
    setSubmitting(false);

    if (result) {
      router.back();
    } else {
      setError('Could not save workplace');
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
          <Type variant="h3">New workplace</Type>
          <View style={{ width: 22 }} />
        </View>

        <Stack gap="2xl" style={styles.body}>
          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Coffee Bean"
            autoFocus
          />

          <TextField
            label="Hourly rate"
            value={hourlyRate}
            onChangeText={setHourlyRate}
            placeholder="26.00"
            keyboardType="decimal-pad"
          />

          <Stack gap="sm">
            <Type variant="micro" tone="muted">
              Color
            </Type>
            <Row gap="md" style={{ flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: c,
                      borderColor: color === c ? theme.text : 'transparent',
                    },
                  ]}
                />
              ))}
            </Row>
          </Stack>

          {error ? (
            <Type variant="caption" tone="danger">
              {error}
            </Type>
          ) : null}

          <Button label="Save workplace" onPress={onSubmit} loading={submitting} />
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
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
  },
});
