import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { minTouch, radius, space, useTheme } from '../tokens';
import { AppText } from './AppText';
import { tr } from '@/core/i18n/i18n';

export interface Choice<T extends string> {
  value: T;
  label: string;
}

/** Single-choice chips (radio group). */
export function ChoiceChips<T extends string>({
  choices,
  value,
  onChange,
  label,
}: {
  choices: readonly Choice<T>[];
  value: T | null;
  onChange: (v: T) => void;
  label?: string;
}) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label ? tr(label) : undefined}>
        {choices.map((c) => {
          const on = c.value === value;
          return (
            <Pressable
              key={c.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={tr(c.label)}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onChange(c.value);
              }}
              style={[styles.chip, { backgroundColor: on ? t.brand : t.surface, borderColor: on ? t.brand : t.border }]}>
              <AppText variant="label" style={{ color: on ? t.onBrand : t.ink }}>
                {c.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { minHeight: minTouch, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center' },
});
