import { forwardRef } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { radius, spacing, typography } from '@/constants/Theme';
import { useTheme } from '@/components/useTheme';
import { Type } from '@/components/ui/Type';

type Props = TextInputProps & {
  label?: string;
  error?: string;
};

export const TextField = forwardRef<TextInput, Props>(
  ({ label, error, style, ...rest }, ref) => {
    const theme = useTheme();
    return (
      <View style={{ gap: spacing.xs }}>
        {label ? (
          <Type variant="micro" tone="muted">
            {label}
          </Type>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={theme.textSubtle}
          style={[
            styles.input,
            typography.body,
            {
              color: theme.text,
              backgroundColor: theme.surface,
              borderColor: error ? theme.danger : theme.border,
            },
            style,
          ]}
          {...rest}
        />
        {error ? (
          <Type variant="caption" tone="danger">
            {error}
          </Type>
        ) : null}
      </View>
    );
  },
);

TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
  },
});
