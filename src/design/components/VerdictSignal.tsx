// Signature component: a vertical traffic light with the active lamp glowing, plus the headline (CLAUDE.md §12).
import { StyleSheet, View } from 'react-native';

import type { Verdict } from '@/core/types';
import { POSSIBLE_SCAM_HEADLINE, PPI_REMINDER, VERDICT_HEADLINE } from '@/core/verdict/strings';

import { radius, space, useTheme, verdictColor, type SignalColor, type Theme } from '../tokens';
import { AppText } from './AppText';
import { tr } from '@/core/i18n/i18n';

const LAMPS: SignalColor[] = ['stop', 'warn', 'caution', 'go'];

/** `theme` forces a palette (the share card is always light), otherwise it follows the phone. */
export function VerdictSignal({ verdict, possibleScam = false, theme }: { verdict: Verdict; possibleScam?: boolean; theme?: Theme }) {
  const current = useTheme();
  const t = theme ?? current;
  const active = verdictColor[verdict];
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
        {LAMPS.map((c) => {
          const on = c === active;
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
      <View style={styles.text}>
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
