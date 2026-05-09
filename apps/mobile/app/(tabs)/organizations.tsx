import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Stack } from '@/components/ui/Stack';
import { Type } from '@/components/ui/Type';
import { radius, spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';

const orgs = [
  { id: '1', name: 'Coffee Bean', rate: 26.0, category: 'Hospitality', color: '#F59E0B' },
  { id: '2', name: 'Library', rate: 32.5, category: 'Casual', color: '#5E6AD2' },
  { id: '3', name: 'Tutoring', rate: 45.0, category: 'Self-employed', color: '#10B981' },
];

export default function OrganizationsScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <Screen>
        <Stack gap="3xl">
          <Stack gap="xs">
            <Type variant="display">Workplaces</Type>
            <Type variant="caption" tone="muted">
              {orgs.length} active
            </Type>
          </Stack>

          <Pressable
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
            {orgs.map((org) => (
              <Card key={org.id}>
                <Row gap="lg">
                  <View style={[styles.colorDot, { backgroundColor: org.color }]} />
                  <Stack gap="xs" style={{ flex: 1 }}>
                    <Type variant="h3">{org.name}</Type>
                    <Type variant="caption" tone="muted">
                      ${org.rate.toFixed(2)}/h · {org.category}
                    </Type>
                  </Stack>
                  <Feather name="chevron-right" size={18} color={theme.textSubtle} />
                </Row>
              </Card>
            ))}
          </Stack>
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
