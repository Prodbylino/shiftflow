import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { spacing } from '@/constants/Theme';

type GapKey = keyof typeof spacing;

type Props = {
  children: ReactNode;
  gap?: GapKey;
  align?: 'flex-start' | 'center' | 'flex-end' | 'baseline';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between';
  style?: StyleProp<ViewStyle>;
};

export function Row({ children, gap = 'md', align = 'center', justify = 'flex-start', style }: Props) {
  return (
    <View
      style={[
        styles.row,
        { gap: spacing[gap], alignItems: align, justifyContent: justify },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
});
