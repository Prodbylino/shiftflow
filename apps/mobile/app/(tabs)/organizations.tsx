import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback } from 'react';

import { useAuth, useOrganizations } from '@timesheetai/shared';

import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Stack } from '@/components/ui/Stack';
import { SwipeableRow } from '@/components/ui/SwipeableRow';
import { Type } from '@/components/ui/Type';
import { radius, spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

export default function OrganizationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { organizations, loading, refetch, deleteOrganization } = useOrganizations(
    user?.id ?? null,
  );

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

          {loading ? (
            <Card>
              <ActivityIndicator color={theme.textMuted} />
            </Card>
          ) : organizations.length === 0 ? (
            <Pressable
              onPress={() => router.push('/add-workplace')}
              style={({ pressed }) => [
                styles.emptyCard,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceMuted }]}>
                <Feather name="briefcase" size={28} color={theme.text} />
              </View>
              <Stack gap="xs" style={{ alignItems: 'center' }}>
                <Type variant="h2">Add your first workplace</Type>
                <Type variant="caption" tone="muted" style={{ textAlign: 'center' }}>
                  Workplaces hold the hourly rate and color used across the calendar
                </Type>
              </Stack>
              <View style={[styles.emptyCta, { backgroundColor: theme.text }]}>
                <Feather name="plus" size={16} color={theme.bg} />
                <Type variant="captionMedium" style={{ color: theme.bg }}>
                  Add workplace
                </Type>
              </View>
            </Pressable>
          ) : (
            <>
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

              <Stack gap="sm">
                {organizations.map((org) => (
                  <SwipeableRow
                    key={org.id}
                    confirmTitle="Delete workplace?"
                    confirmMessage="Existing shifts at this workplace will also be removed."
                    onDelete={() => deleteOrganization(org.id)}>
                    <Pressable
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
                  </SwipeableRow>
                ))}
              </Stack>
            </>
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
  emptyCard: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
});
