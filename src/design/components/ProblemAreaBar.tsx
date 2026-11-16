// Signature component: one owner-complaint group as a labeled bar (CLAUDE.md §6.3, §12).
import { StyleSheet, View } from 'react-native';

import { radius, space, useTheme } from '../tokens';
import { AppText } from './AppText';
import { tr, plural } from '@/core/i18n/i18n';

export function ProblemAreaBar({ label, count, max }: { label: string; count: number; max: number }) {
  const t = useTheme();
  const pct = max > 0 ? Math.max(0.04, count / max) : 0;
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${tr(label)}: ${plural(count, '{n} complaint', '{n} complaints', '{n} de reclamații')}`}>
      <View style={styles.labels}>
        <AppText variant="label">{label}</AppText>
        <AppText variant="label" tone="muted" style={styles.count}>
          {count.toLocaleString('en-US')}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: t.sunken }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: t.brand }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.xs },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  count: { fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
