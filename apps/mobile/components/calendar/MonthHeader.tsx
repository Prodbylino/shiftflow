import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet } from 'react-native';

import { Row } from '@/components/ui/Row';
import { Type } from '@/components/ui/Type';
import { spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';
import { monthLabel } from './utils';

type Props = {
  date: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

export function MonthHeader({ date, onPrev, onNext, onToday }: Props) {
  const theme = useTheme();
  return (
    <Row justify="space-between" align="center">
      <Type variant="h1">{monthLabel(date)}</Type>
      <Row gap="sm">
        <Pressable
          onPress={onToday}
          style={({ pressed }) => [
            styles.todayBtn,
            { borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
          ]}>
          <Type variant="captionMedium" tone="muted">
            Today
          </Type>
        </Pressable>
        <IconBtn icon="chevron-left" onPress={onPrev} />
        <IconBtn icon="chevron-right" onPress={onNext} />
      </Row>
    </Row>
  );
}

function IconBtn({
  icon,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconBtn,
        { borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
      ]}>
      <Feather name={icon} size={18} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  todayBtn: {
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
