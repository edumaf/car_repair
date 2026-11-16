import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Severity } from '@/core/types';

import { radius, severityColor, space, useTheme, type SignalColor } from '../tokens';
import { AppText } from './AppText';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** A small pill: colored dot/icon + words (color is never the only signal). */
export function Tag({ label, color, icon }: { label: string; color: SignalColor; icon?: IconName }) {
  const t = useTheme();
  const fg = color === 'caution' && t.scheme === 'light' ? '#B45309' : t[color];
  return (
    <View style={[styles.tag, { backgroundColor: t.tint[color] }]} accessible accessibilityLabel={label}>
      {icon ? <Ionicons name={icon} size={13} color={fg} /> : <View style={[styles.dot, { backgroundColor: t[color] }]} />}
      <AppText variant="overline" style={{ color: fg }}>
        {label}
      </AppText>
    </View>
  );
}

const SEVERITY_LABEL: Record<Severity, string> = { info: 'Info', minor: 'Minor', major: 'Major', critical: 'Critical' };
const SEVERITY_ICON: Record<Severity, IconName> = {
  info: 'information-circle',
  minor: 'remove-circle',
  major: 'alert-circle',
  critical: 'warning',
};

export function SeverityTag({ severity }: { severity: Severity }) {
  return <Tag label={SEVERITY_LABEL[severity]} color={severityColor[severity]} icon={SEVERITY_ICON[severity]} />;
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
