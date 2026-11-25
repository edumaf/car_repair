// A small scanner preview for the camera-permission screen: a VIN in a frame with road-paint corner marks and a
// sweeping scan line, the same motion as the real VIN scanner. Decorative; still when Reduce Motion is on.
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';

import { radius, space, useTheme } from '../tokens';
import { AppText } from './AppText';

const CORNER = 22;

export function VinScanDemo() {
  const t = useTheme();
  const reduce = useReduceMotion();
  const [h, setH] = useState(0);
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduce || !h) return;
    y.value = withRepeat(withTiming(h - 3, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduce, h, y]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  const corner = (pos: object) => <View style={[styles.corner, { borderColor: t.lane }, pos]} />;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, { backgroundColor: t.nightRaised }]}
      onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      {corner({ top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: radius.md })}
      {corner({ top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: radius.md })}
      {corner({ bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: radius.md })}
      {corner({ bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: radius.md })}
      <View style={styles.bars}>
        {[3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2, 1, 3, 1, 1, 2, 3, 1, 2].map((w, i) => (
          <View key={i} style={{ width: w, height: 30, backgroundColor: t.onNight, opacity: 0.85 }} />
        ))}
      </View>
      <AppText variant="mono" tone="onNight" align="center">
        1N4 AL3AP4 DC900001
      </AppText>
      {h ? <Animated.View style={[styles.sweep, { backgroundColor: t.lane, shadowColor: t.lane }, reduce ? { top: h / 2 } : sweep]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: radius.md, paddingVertical: space.xl, paddingHorizontal: space.lg, gap: space.md, overflow: 'hidden' },
  corner: { position: 'absolute', width: CORNER, height: CORNER },
  bars: { flexDirection: 'row', justifyContent: 'center', gap: 2 },
  sweep: { position: 'absolute', left: space.md, right: space.md, top: 0, height: 3, borderRadius: 2, shadowOpacity: 0.9, shadowRadius: 8 },
});
