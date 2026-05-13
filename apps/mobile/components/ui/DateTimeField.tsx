import DateTimePicker from '@react-native-community/datetimepicker';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';
import { Type } from '@/components/ui/Type';

type Props = {
  label?: string;
  value: Date;
  onChange: (next: Date) => void;
  mode: 'date' | 'time';
  minimumDate?: Date;
  maximumDate?: Date;
};

export function DateTimeField({ label, value, onChange, mode, minimumDate, maximumDate }: Props) {
  const theme = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <Type variant="micro" tone="muted">
          {label}
        </Type>
      ) : null}
      <View style={styles.pickerRow}>
        <DateTimePicker
          value={value}
          mode={mode}
          display="compact"
          minuteInterval={mode === 'time' ? 5 : undefined}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          themeVariant={theme.scheme}
          onChange={(_event, selected) => {
            if (selected) onChange(selected);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
});
