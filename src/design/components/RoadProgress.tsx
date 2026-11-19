// Progress drawn as a road: one stretch of lane marks per step, painted yellow as you go, and our little line-art
// car driving to the current step. Used in onboarding (night panels). Still when Reduce Motion is on.
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { tr } from '@/core/i18n/i18n';
import { useReduceMotion } from '@/hooks/useReduceMotion';

import { space, useTheme } from '../tokens';
import { CarArt } from './CarArt';

const CAR_W = 40;
const DASHES_PER_STEP = 3;

export function RoadProgress({ total, current }: { total: number; current: number }) {
  const t = useTheme();
  const reduce = useReduceMotion();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  // The car's nose sits at the end of the current step's stretch.
  const target = width ? Math.max(0, Math.min(width - CAR_W, (width * (current + 1)) / total - CAR_W)) : 0;

  useEffect(() => {
    x.value = reduce ? target : withTiming(target, { duration: 520, easing: Easing.out(Easing.cubic) });
  }, [target, reduce, x]);
  const carStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={tr('Step {n} of {total}', { n: current + 1, total })}
      style={styles.root}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.car, carStyle]} importantForAccessibility="no-hide-descendants">
        <CarArt kind="hatchback" width={CAR_W} color={t.onNight} />
      </Animated.View>
      <View style={styles.road}>
        {Array.from({ length: total }, (_, step) => (
          <View key={step} style={styles.stretch}>
            {Array.from({ length: DASHES_PER_STEP }, (_, d) => (
              <View
                key={d}
                style={[styles.dash, { backgroundColor: step <= current ? t.lane : 'rgba(244,247,251,0.18)' }]}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 2 },
  car: { height: (CAR_W * 100) / 240 },
  road: { flexDirection: 'row', gap: space.sm },
  stretch: { flex: 1, flexDirection: 'row', gap: 5 },
  dash: { flex: 1, height: 4, borderRadius: 2 },
});
