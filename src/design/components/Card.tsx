import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { hairline, radius, space, useTheme } from '../tokens';

/** A white panel with a thin border (no heavy shadows, CLAUDE.md §12). */
export function Card({ children, style, padded = true }: { children: ReactNode; style?: ViewStyle; padded?: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, padded && styles.padded, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: hairline },
  padded: { padding: space.lg, gap: space.sm },
});
