import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { spacing } from '@/constants/Theme';

type GapKey = keyof typeof spacing;

type Props = {
  children: ReactNode;
  gap?: GapKey;
  style?: StyleProp<ViewStyle>;
};

export function Stack({ children, gap = 'md', style }: Props) {
  return <View style={[styles.stack, { gap: spacing[gap] }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  stack: {
    flexDirection: 'column',
  },
});
