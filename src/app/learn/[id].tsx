// One Learn guide.
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { getGuide } from '@/core/data/learn';
import { AppText } from '@/design/components/AppText';
import { ErrorState } from '@/design/components/States';
import { space, useTheme } from '@/design/tokens';

export default function GuideScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const g = getGuide(id ?? '');
  if (!g) return <ErrorState title="Guide not found" message="Go back to Learn." />;
  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <AppText variant="overline" tone="muted">
        {g.minutes} min read
      </AppText>
      <AppText variant="display" accessibilityRole="header">
        {g.title}
      </AppText>
      {g.sections.map((s, i) => (
        <View key={i} style={styles.section}>
          {s.heading ? <AppText variant="heading">{s.heading}</AppText> : null}
          {s.text?.map((p, j) => (
            <AppText key={j}>{p}</AppText>
          ))}
          {s.bullets?.map((b, j) => (
            <View key={j} style={styles.bullet}>
              <AppText tone="brand">•</AppText>
              <AppText style={{ flex: 1 }}>{b}</AppText>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxxl },
  section: { gap: space.sm },
  bullet: { flexDirection: 'row', gap: space.sm },
});
