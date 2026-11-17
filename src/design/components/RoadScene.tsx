// "Night road" scene for hero panels: our line-art car in the near lane, oncoming traffic in the far lane and
// road-paint lane marks sliding by. Decorative only (hidden from screen readers); still when Reduce Motion is on.
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { BodyKind } from '@/core/vehicle/bodyKind';
import { useReduceMotion } from '@/hooks/useReduceMotion';

import { useTheme } from '../tokens';
import { CarArt } from './CarArt';

const DASH = 26;
const GAP = 22;
const PERIOD = DASH + GAP;
const FAR_W = 74;
/** Oncoming cars: body type and where in the loop each one starts. */
const ONCOMING: { kind: BodyKind; phase: number }[] = [
  { kind: 'suv', phase: 0 },
  { kind: 'hatchback', phase: 0.38 },
  { kind: 'van', phase: 0.71 },
];

function Oncoming({ t, width, kind, phase, color }: { t: SharedValue<number>; width: number; kind: BodyKind; phase: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const p = (t.value + phase) % 1;
    // Right to left, starting just off-screen on the right.
    return { transform: [{ translateX: width - p * (width + FAR_W * 1.6) }, { scaleX: -1 }] };
  });
  return (
    <Animated.View style={[styles.far, style]}>
      <CarArt kind={kind} width={FAR_W} color={color} />
    </Animated.View>
  );
}

export function RoadScene({ hero = 'sedan', heroWidth = 170, height = 132 }: { hero?: BodyKind; heroWidth?: number; height?: number }) {
  const t = useTheme();
  const reduce = useReduceMotion();
  const [width, setWidth] = useState(0);
  const traffic = useSharedValue(0.15);
  const lane = useSharedValue(0);
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduce || !width) return;
    traffic.value = withRepeat(withTiming(traffic.value + 1, { duration: 9000, easing: Easing.linear }), -1, false);
    lane.value = withRepeat(withTiming(1, { duration: 520, easing: Easing.linear }), -1, false);
    bob.value = withRepeat(withSequence(withTiming(-1.2, { duration: 260 }), withTiming(0, { duration: 260 })), -1, false);
    return () => {
      cancelAnimation(traffic);
      cancelAnimation(lane);
      cancelAnimation(bob);
    };
  }, [reduce, width, traffic, lane, bob]);

  const laneStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -lane.value * PERIOD }] }));
  const heroStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));
  const dashes = Math.ceil(width / PERIOD) + 2;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.root, { height }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width ? (
        <>
          {ONCOMING.map((c) => (
            <Oncoming key={c.kind} t={traffic} width={width} kind={c.kind} phase={c.phase} color="rgba(244,247,251,0.28)" />
          ))}
          <Animated.View style={[styles.lane, { top: height * 0.47 }, laneStyle]}>
            {Array.from({ length: dashes }, (_, i) => (
              <View key={i} style={[styles.dash, { backgroundColor: t.lane }]} />
            ))}
          </Animated.View>
          <Animated.View style={[styles.hero, { left: Math.max(0, width * 0.5 - heroWidth * 0.62) }, heroStyle]}>
            <CarArt kind={hero} width={heroWidth} color={t.onNight} />
          </Animated.View>
          <View style={[styles.edge, { backgroundColor: 'rgba(244,247,251,0.22)' }]} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', overflow: 'hidden' },
  far: { position: 'absolute', top: 4, left: 0 },
  lane: { position: 'absolute', left: 0, flexDirection: 'row', gap: GAP },
  dash: { width: DASH, height: 4, borderRadius: 2 },
  hero: { position: 'absolute', bottom: 6 },
  edge: { position: 'absolute', left: 0, right: 0, bottom: 4, height: 2, borderRadius: 1 },
});
