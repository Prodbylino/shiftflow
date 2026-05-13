import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback } from 'react';

import { useAuth, useOrganizations } from '@shiftflow/shared';

import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Stack } from '@/components/ui/Stack';
import { Type } from '@/components/ui/Type';
import { radius, spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

export default function OrganizationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { organizations, loading, refetch } = useOrganizations(user?.id ?? null);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <Screen onRefresh={refetch}>
        <Stack gap="3xl">
          <Stack gap="xs">
            <Type variant="display">Workplaces</Type>
            <Type variant="caption" tone="muted">
              {loading ? 'Loading…' : `${organizations.length} active`}
            </Type>
          </Stack>

          <Pressable
            onPress={() => router.push('/add-workplace')}
            style={({ pressed }) => [
              styles.addButton,
              {
                borderColor: theme.border,
                backgroundColor: theme.surface,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <Feather name="plus" size={18} color={theme.text} />
            <Type variant="bodyMedium">Add workplace</Type>
          </Pressable>

          {loading ? (
            <Card>
              <ActivityIndicator color={theme.textMuted} />
            </Card>
          ) : organizations.length === 0 ? (
            <Card>
              <Stack gap="xs" style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                <Feather name="briefcase" size={28} color={theme.textSubtle} />
                <Type variant="bodyMedium" tone="muted">
                  No workplaces yet
                </Type>
                <Type variant="caption" tone="subtle">
                  Add one to start logging shifts
                </Type>
              </Stack>
            </Card>
          ) : (
            <Stack gap="sm">
              {organizations.map((org) => (
                <Pressable
                  key={org.id}
                  onPress={() =>
                    router.push({ pathname: '/workplace/[id]', params: { id: org.id } })
                  }
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                  <Card>
                    <Row gap="lg">
                      <View style={[styles.colorDot, { backgroundColor: org.color }]} />
                      <Stack gap="xs" style={{ flex: 1 }}>
                        <Type variant="h3">{org.name}</Type>
                        <Type variant="caption" tone="muted">
                          ${Number(org.hourly_rate).toFixed(2)}/h
                        </Type>
                      </Stack>
                      <Feather name="chevron-right" size={18} color={theme.textSubtle} />
                    </Row>
                  </Card>
                </Pressable>
              ))}
            </Stack>
          )}
        </Stack>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
