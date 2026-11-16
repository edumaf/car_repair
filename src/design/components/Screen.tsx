import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { space, useTheme } from '../tokens';
import { AppText } from './AppText';

interface ScreenProps {
  title?: string;
  /** Small uppercase line above the title. */
  overline?: string;
  children: ReactNode;
  scroll?: boolean;
}

/** Standard tab screen: safe area, page background, big condensed title. */
export function Screen({ title, overline, children, scroll = true }: ScreenProps) {
  const t = useTheme();
  const header = title ? (
    <View style={styles.header}>
      {overline ? (
        <AppText variant="overline" tone="muted">
          {overline}
        </AppText>
      ) : null}
      <AppText variant="display" accessibilityRole="header">
        {title}
      </AppText>
    </View>
  ) : null;
  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: t.bg }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content}>
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  content: { padding: space.xl, paddingBottom: space.xxxl, gap: space.lg },
  header: { gap: space.xxs, marginBottom: space.xs },
});
