// A VIN in monospace, grouped 3-6-8 (CLAUDE.md §12 VinField display part).
import { StyleSheet, View } from 'react-native';

import { groupVin } from '@/core/vin/vin';

import { space } from '../tokens';
import { AppText } from './AppText';

export function VinText({ vin }: { vin: string }) {
  const groups = groupVin(vin);
  return (
    <View style={styles.row} accessible accessibilityLabel={`VIN ${vin.split('').join(' ')}`}>
      {groups.map((g, i) => (
        <AppText key={i} variant="mono" tone={i === 2 ? 'ink' : 'muted'}>
          {g}
        </AppText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' } });
