// The four answers for a checklist item (CLAUDE.md §6.4), with a haptic tick (§12).
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Answer } from '@/core/types';

import { minTouch, radius, space, useTheme, type SignalColor } from '../tokens';
import { AppText } from './AppText';

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
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Your answer">
      {OPTIONS.map((o) => {
        const on = value === o.value;
        const color = o.color === 'caution' && t.scheme === 'light' ? '#B45309' : t[o.color];
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={o.label}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onChange(o.value);
            }}
            style={({ pressed }) => [
              styles.btn,
              { borderColor: on ? color : t.border, backgroundColor: on ? t.tint[o.color] : t.surface },
              pressed && { transform: [{ scale: 0.97 }] },
            ]}>
            <Ionicons name={on ? o.icon : (`${o.icon}-outline` as never)} size={22} color={on ? color : t.muted} />
            <AppText variant="label" style={{ color: on ? color : t.ink, fontSize: 12 }} numberOfLines={1}>
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
