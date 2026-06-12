import Feather from '@expo/vector-icons/Feather';
import { ReactNode, useRef } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { useI18n } from '@timesheetai/shared';

import { radius, spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';
import { Type } from '@/components/ui/Type';

type Props = {
  children: ReactNode;
  onDelete: () => Promise<unknown> | unknown;
  confirmTitle?: string;
  confirmMessage?: string;
};

export function SwipeableRow({ children, onDelete, confirmTitle, confirmMessage }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const ref = useRef<Swipeable | null>(null);

  const requestDelete = () => {
    Alert.alert(
      confirmTitle ?? t('common.deleteTitle'),
      confirmMessage ?? t('common.deleteMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
          onPress: () => ref.current?.close(),
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await onDelete();
            ref.current?.close();
          },
        },
      ],
    );
  };

  return (
    <Swipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.actionWrap}>
          <Pressable
            onPress={requestDelete}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: theme.danger, opacity: pressed ? 0.85 : 1 },
            ]}>
            <Feather name="trash-2" size={18} color="#fff" />
            <Type variant="captionMedium" style={{ color: '#fff' }}>
              {t('common.delete')}
            </Type>
          </Pressable>
        </View>
      )}>
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionWrap: {
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  action: {
    width: 84,
    height: '100%',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
});
