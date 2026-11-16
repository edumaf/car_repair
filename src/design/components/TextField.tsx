import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { minTouch, radius, space, useTheme } from '../tokens';
import { type } from '../typography';
import { AppText } from './AppText';
import { tr } from '@/core/i18n/i18n';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Shown before the input, e.g. "$". */
  prefix?: string;
  suffix?: string;
  hint?: string;
}

export function TextField({ label, prefix, suffix, hint, multiline, ...rest }: TextFieldProps) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <AppText variant="label">{label}</AppText>
      <View style={[styles.box, { backgroundColor: t.surface, borderColor: t.border }, multiline && styles.multi]}>
        {prefix ? <AppText tone="muted">{prefix}</AppText> : null}
        <TextInput
          {...rest}
          placeholder={rest.placeholder ? tr(rest.placeholder) : undefined}
          multiline={multiline}
          accessibilityLabel={tr(label)}
          placeholderTextColor={t.faint}
          style={[type.body, styles.input, { color: t.ink }, multiline && styles.multiInput]}
        />
        {suffix ? <AppText tone="muted">{suffix}</AppText> : null}
      </View>
      {hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

/** Parses "15,900" / "$15900" into 15900; empty or invalid → null. */
export function parseNumber(text: string): number | null {
  const n = Number(text.replace(/[^0-9.]/g, ''));
  return text.trim() === '' || !Number.isFinite(n) ? null : n;
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: minTouch + 4,
  },
  input: { flex: 1, paddingVertical: space.sm },
  multi: { alignItems: 'flex-start', paddingVertical: space.xs },
  multiInput: { minHeight: 88, textAlignVertical: 'top' },
});
