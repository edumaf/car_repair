// The four answers for a checklist item (CLAUDE.md §6.4), with a haptic tick (§12).
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Answer } from '@/core/types';

import { minTouch, radius, space, useTheme, type SignalColor } from '../tokens';
import { AppText } from './AppText';
import { tr } from '@/core/i18n/i18n';

const OPTIONS: { value: Answer; label: string; icon: ComponentProps<typeof Ionicons>['name']; color: SignalColor }[] = [
  { value: 'ok', label: 'Looks OK', icon: 'checkmark-circle', color: 'go' },
  { value: 'problem', label: 'Problem', icon: 'alert-circle', color: 'warn' },
  { value: 'not_sure', label: 'Not sure', icon: 'help-circle', color: 'caution' },
  { value: 'skip', label: 'Skip', icon: 'play-skip-forward', color: 'slate' },
];

export const ANSWER_LABEL: Record<Answer, string> = { ok: 'Looks OK', problem: 'Problem', not_sure: 'Not sure', skip: 'Skipped' };

export function AnswerBar({ value, onChange }: { value: Answer | null; onChange: (a: Answer) => void }) {
  const t = useTheme();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={tr('Your answer')}>
      {OPTIONS.map((o) => {
        const on = value === o.value;
        const color = o.color === 'caution' && t.scheme === 'light' ? '#B45309' : t[o.color];
        // Always in its own color; the chosen one fills in solid so it's obvious the answer was saved.
        const solid = t[o.color];
        const onSolid = o.color === 'caution' ? t.night : '#FFFFFF';
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={tr(o.label)}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onChange(o.value);
            }}
            style={({ pressed }) => [
              styles.btn,
              { borderColor: on ? solid : t.tint[o.color], backgroundColor: on ? solid : t.tint[o.color] },
              (pressed || on) && { transform: [{ scale: pressed ? 0.96 : 1.02 }] },
            ]}>
            <Ionicons name={on ? o.icon : (`${o.icon}-outline` as never)} size={22} color={on ? onSolid : color} />
            <AppText variant="label" style={{ color: on ? onSolid : color, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  btn: {
    flex: 1,
    minHeight: minTouch + 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});
