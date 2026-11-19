// Dark "night road" hero panel (CLAUDE.md §12 signature look for hero areas). Stays dark in light and dark mode.
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, space, useTheme } from '../tokens';

export function NightPanel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[styles.panel, { backgroundColor: t.night, borderColor: t.nightRaised }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.lg, borderWidth: 1, padding: space.xl, gap: space.sm, overflow: 'hidden' },
});
