// A tiny traffic light (red, amber, green) that marks the way to the verdict, e.g. in the inspection header.
// The words next to it carry the meaning; the lamps only make the button easy to spot (color is never the only signal).
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../tokens';

export function MiniSignal() {
  const t = useTheme();
  return (
    <View style={[styles.housing, { backgroundColor: t.night }]} accessible={false} importantForAccessibility="no-hide-descendants">
      {[t.stop, t.caution, t.go].map((c) => (
        <View key={c} style={[styles.lamp, { backgroundColor: c }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  housing: { width: 12, paddingVertical: 2, borderRadius: 6, alignItems: 'center', gap: 2 },
  lamp: { width: 7, height: 7, borderRadius: 3.5 },
});
