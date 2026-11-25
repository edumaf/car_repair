// Signature component: a low–high repair cost band (always a range, CLAUDE.md §2.4).
import { StyleSheet, View } from 'react-native';

import type { CostRange } from '@/core/types';

import { radius, space, useTheme } from '../tokens';
import { AppText } from './AppText';
import { tr } from '@/core/i18n/i18n';

export const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

export function CostRangeBar({ range, scaleMax }: { range: CostRange; scaleMax: number }) {
  const t = useTheme();
  const left = Math.min(1, range.low / scaleMax);
  const width = Math.max(0.03, Math.min(1, range.high / scaleMax) - left);
  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={tr('Typical range {low} to {high}', { low: usd(range.low), high: usd(range.high) })}>
      <AppText variant="number">
        {usd(range.low)}–{usd(range.high)}
      </AppText>
      <View style={[styles.track, { backgroundColor: t.sunken }]}>
        <View style={[styles.band, { left: `${left * 100}%`, width: `${width * 100}%`, backgroundColor: t.warn }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  track: { height: 10, borderRadius: radius.pill, overflow: 'hidden' },
  band: { position: 'absolute', top: 0, bottom: 0, borderRadius: radius.pill },
});
