// Year make model + trim/engine/drive line + powertrain tag (+ VIN). Used on confirm and report screens.
// With `kind` (body type), it becomes a night-road panel with our line-art drawing of that body type.
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import type { Powertrain } from '@/core/types';
import type { BodyKind } from '@/core/vehicle/bodyKind';
import { powertrainLabel } from '@/core/vehicle/labels';

import { radius, space, useTheme } from '../tokens';
import { AppText } from './AppText';
import { CarArt } from './CarArt';
import { NightPanel } from './NightPanel';
import { Tag } from './Tag';
import { VinText } from './VinText';

const PT_ICON = { gas: 'flame', diesel: 'water', hybrid: 'leaf', ev: 'flash' } as const;

interface CarHeaderProps {
  title: string;
  trim?: string | null;
  engineDesc?: string | null;
  drive?: string | null;
  body?: string | null;
  powertrain: Powertrain;
  vin?: string | null;
  overline?: string;
  kind?: BodyKind;
}

export function CarHeader(props: CarHeaderProps) {
  const t = useTheme();
  const details = [props.trim, props.engineDesc, props.drive, props.body].filter(Boolean).join(' · ');
  if (props.kind) {
    return (
      <NightPanel style={styles.night}>
        <View style={styles.art}>
          <CarArt kind={props.kind} width={150} color={t.onNight} />
          <View style={[styles.lane, { backgroundColor: t.lane }]} />
        </View>
        {props.overline ? (
          <AppText variant="overline" tone="lane">
            {props.overline}
          </AppText>
        ) : null}
        <AppText variant="display" tone="onNight" accessibilityRole="header">
          {props.title}
        </AppText>
        {details ? <AppText tone="onNightMuted">{details}</AppText> : null}
        <View style={[styles.pill, { backgroundColor: t.nightRaised }]}>
          <Ionicons name={PT_ICON[props.powertrain]} size={13} color={t.lane} />
          <AppText variant="overline" tone="lane">
            {powertrainLabel(props.powertrain)}
          </AppText>
        </View>
        {props.vin ? <VinText vin={props.vin} onNight /> : null}
      </NightPanel>
    );
  }
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
  night: { gap: space.xs, paddingTop: space.lg },
  art: { alignSelf: 'flex-end', marginBottom: -space.xs, marginRight: -space.xs },
  lane: { height: 3, borderRadius: 2, marginHorizontal: space.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginVertical: space.xs,
  },
});
