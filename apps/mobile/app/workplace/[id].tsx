import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, useOrganizations } from '@timesheetai/shared';

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

export default function WorkplaceDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { organizations, updateOrganization, deleteOrganization } = useOrganizations(
    user?.id ?? null,
  );

  const org = organizations.find((o) => o.id === id);

  const [name, setName] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (org && !hydrated) {
      setName(org.name);
      setHourlyRate(String(org.hourly_rate));
      setColor(org.color);
      setHydrated(true);
    }
  }, [org, hydrated]);

  if (!org) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="x" size={22} color={theme.text} />
          </Pressable>
          <Type variant="h3">Workplace</Type>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.emptyState}>
          <Type variant="bodyMedium" tone="muted">
            Workplace not found
          </Type>
        </View>
      </SafeAreaView>
    );
  }

  const onSave = async () => {
    setError(null);
    const trimmed = name.trim();
    const rate = parseFloat(hourlyRate);
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      setError('Enter a valid hourly rate');
      return;
    }
    setSubmitting(true);
    const ok = await updateOrganization(org.id, { name: trimmed, color, hourly_rate: rate });
    setSubmitting(false);
    if (ok) {
      router.back();
    } else {
      setError('Could not save changes');
    }
  };

  const onDelete = () => {
    Alert.alert(
      'Delete workplace?',
      'Existing shifts at this workplace will also be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const ok = await deleteOrganization(org.id);
            setDeleting(false);
            if (ok) {
              router.back();
            } else {
              setError('Could not delete workplace');
            }
          },
        },
      ],
    );
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
          <Type variant="h3">Edit workplace</Type>
          <View style={{ width: 22 }} />
        </View>

        <Stack gap="2xl" style={styles.body}>
          <TextField label="Name" value={name} onChangeText={setName} placeholder="Coffee Bean" />

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

          <Stack gap="md">
            <Button label="Save changes" onPress={onSave} loading={submitting} />
            <Button
              label="Delete workplace"
              variant="ghost"
              onPress={onDelete}
              loading={deleting}
              style={{ borderColor: theme.danger }}
            />
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
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
