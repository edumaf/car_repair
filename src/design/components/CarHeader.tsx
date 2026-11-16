// Year make model + trim/engine/drive line + powertrain tag (+ VIN). Used on confirm and report screens.
import { StyleSheet, View } from 'react-native';

import type { Powertrain } from '@/core/types';
import { powertrainLabel } from '@/core/vehicle/labels';

import { space } from '../tokens';
import { AppText } from './AppText';
import { Tag } from './Tag';
import { VinText } from './VinText';

const PT_ICON = { gas: 'flame', diesel: 'water', hybrid: 'leaf', ev: 'flash' } as const;

export function CarHeader(props: {
  title: string;
  trim?: string | null;
  engineDesc?: string | null;
  drive?: string | null;
  body?: string | null;
  powertrain: Powertrain;
  vin?: string | null;
  overline?: string;
}) {
  const details = [props.trim, props.engineDesc, props.drive, props.body].filter(Boolean).join(' · ');
  return (
    <View style={styles.wrap}>
      {props.overline ? (
        <AppText variant="overline" tone="muted">
          {props.overline}
        </AppText>
      ) : null}
      <AppText variant="display" accessibilityRole="header">
        {props.title}
      </AppText>
      {details ? <AppText tone="muted">{details}</AppText> : null}
      <View style={styles.tags}>
        <Tag label={powertrainLabel(props.powertrain)} color="brand" icon={PT_ICON[props.powertrain]} />
      </View>
      {props.vin ? <VinText vin={props.vin} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  tags: { flexDirection: 'row', gap: space.sm, marginVertical: space.xs },
});
