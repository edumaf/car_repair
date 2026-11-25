// Signature component: a vertical traffic light with the active lamp glowing, plus the headline (CLAUDE.md §12).
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';

import type { Verdict } from '@/core/types';
import { POSSIBLE_SCAM_HEADLINE, PPI_REMINDER, VERDICT_HEADLINE } from '@/core/verdict/strings';

import { radius, space, useTheme, verdictColor, type SignalColor, type Theme } from '../tokens';
import { AppText } from './AppText';
import { tr } from '@/core/i18n/i18n';

const LAMPS: SignalColor[] = ['stop', 'warn', 'caution', 'go'];

/**
 * `theme` forces a palette (the share card is always light), otherwise it follows the phone.
 * `reveal`: the lamps light one after another, top to bottom, then the verdict's lamp stays on and the headline
 * appears (a second at most; skipped with Reduce Motion).
 */
export function VerdictSignal({
  verdict,
  possibleScam = false,
  theme,
  reveal = false,
}: {
  verdict: Verdict;
  possibleScam?: boolean;
  theme?: Theme;
  reveal?: boolean;
}) {
  const current = useTheme();
  const t = theme ?? current;
  const active = verdictColor[verdict];
  const reduce = useReduceMotion();
  const animate = reveal && !reduce;
  // While revealing: index of the lamp that's lit (0..3); null when done.
  const [step, setStep] = useState<number | null>(animate ? 0 : null);
  useEffect(() => {
    if (!animate) {
      setStep(null);
      return;
    }
    const timers = [1, 2, 3, 4].map((i) => setTimeout(() => setStep(i < 4 ? i : null), i * 140));
    return () => timers.forEach(clearTimeout);
  }, [animate]);
  const revealing = step !== null;
  const headline = verdict === 'WALK_AWAY' && possibleScam ? POSSIBLE_SCAM_HEADLINE : VERDICT_HEADLINE[verdict];
  return (
    <View
      style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={
        tr('Verdict: {headline}.', { headline: tr(headline) }) + (verdict === 'LOOKS_GOOD_SO_FAR' ? ' ' + tr(PPI_REMINDER) : '')
      }>
      <View style={[styles.housing, { backgroundColor: t.scheme === 'light' ? '#1D2024' : '#0B0C0E' }]}>
        {LAMPS.map((c, i) => {
          const on = revealing ? i === step : c === active;
          return (
            <View
              key={c}
              style={[
                styles.lamp,
                { backgroundColor: on ? t[c] : t.scheme === 'light' ? '#33373D' : '#22262B' },
                on && { shadowColor: t[c], shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
              ]}
            />
          );
        })}
      </View>
      <View style={[styles.text, { opacity: revealing ? 0 : 1 }]}>
        <AppText variant="overline" style={{ color: t.muted }}>
          Verdict
        </AppText>
        <AppText variant="display" style={{ color: active === 'caution' && t.scheme === 'light' ? '#B45309' : t[active] }}>
          {headline}
        </AppText>
        {verdict === 'LOOKS_GOOD_SO_FAR' ? (
          <AppText variant="label" style={{ color: t.muted }}>
            {PPI_REMINDER}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: space.lg, padding: space.lg, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  housing: { paddingVertical: space.sm, paddingHorizontal: space.sm, borderRadius: radius.md, gap: space.sm },
  lamp: { width: 22, height: 22, borderRadius: 11 },
  text: { flex: 1, gap: space.xs },
});
