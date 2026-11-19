// "Where am I on the car?" — a top view of a car (front at the top) built from plain shapes, with the part the
// current inspection section is about lit in road-paint yellow. Decorative: the section title says the same in words.
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { radius, useTheme } from '../tokens';

export type CarZone = 'papers' | 'body' | 'wheels' | 'hood' | 'cabin' | 'under' | 'road' | 'after' | 'battery';

/** Checklist section id → the part of the car it's about. */
export const SECTION_ZONE: Record<string, CarZone> = {
  documents: 'papers',
  exterior: 'body',
  tires_wheels: 'wheels',
  under_hood: 'hood',
  interior: 'cabin',
  underneath: 'under',
  test_drive: 'road',
  after_drive: 'after',
  hybrid_ev: 'battery',
};

export function WalkaroundMap({ zone, size = 1 }: { zone: CarZone | undefined; size?: number }) {
  const t = useTheme();
  const on = t.lane;
  const off = 'rgba(244,247,251,0.32)';
  const c = (z: CarZone | CarZone[]) => ((Array.isArray(z) ? z : [z]).includes(zone as CarZone) ? on : off);
  const s = (n: number) => n * size;
  const box = (style: ViewStyle) => <View style={[{ position: 'absolute' }, style]} />;
  const wheel = (left: number, top: number) =>
    box({ left: s(left), top: s(top), width: s(7), height: s(16), borderRadius: s(2), backgroundColor: c('wheels') });

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.tile, { backgroundColor: t.night, width: s(76), height: s(104) }]}>
      <View style={{ width: s(56), height: s(96) }}>
        {/* Road lanes on both sides (test drive). */}
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={`l${i}`}>
            {box({ left: 0, top: s(4 + i * 19), width: s(3), height: s(11), borderRadius: 2, backgroundColor: c('road') })}
            {box({ left: s(53), top: s(4 + i * 19), width: s(3), height: s(11), borderRadius: 2, backgroundColor: c('road') })}
          </View>
        ))}
        {/* Underneath: a dashed outline under the body. */}
        {box({
          left: s(9),
          top: s(4),
          width: s(38),
          height: s(84),
          borderRadius: s(12),
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: zone === 'under' ? on : 'transparent',
        })}
        {wheel(8, 16)}
        {wheel(41, 16)}
        {wheel(8, 62)}
        {wheel(41, 62)}
        {/* Body. */}
        {box({ left: s(12), top: s(7), width: s(32), height: s(78), borderRadius: s(10), borderWidth: 2, borderColor: c('body'), backgroundColor: t.night })}
        {/* Bonnet / engine bay. */}
        {box({
          left: s(16),
          top: s(11),
          width: s(24),
          height: s(17),
          borderRadius: s(5),
          borderWidth: 2,
          borderColor: c(['hood', 'after']),
          backgroundColor: zone === 'hood' || zone === 'after' ? 'rgba(255,200,61,0.25)' : 'transparent',
        })}
        {/* Cabin. */}
        {box({
          left: s(16),
          top: s(32),
          width: s(24),
          height: s(32),
          borderRadius: s(5),
          borderWidth: 2,
          borderColor: c('cabin'),
          backgroundColor: zone === 'cabin' ? 'rgba(255,200,61,0.25)' : 'transparent',
        })}
        {/* Battery pack in the floor (hybrid / EV / diesel extras). */}
        {zone === 'battery' ? box({ left: s(21), top: s(38), width: s(14), height: s(20), borderRadius: s(3), backgroundColor: on }) : null}
        {/* Boot. */}
        {box({ left: s(16), top: s(68), width: s(24), height: s(12), borderRadius: s(4), borderWidth: 2, borderColor: c('body') })}
        {/* A drip under the engine (checking for leaks after the drive). */}
        {zone === 'after' ? box({ left: s(26), top: s(88), width: s(5), height: s(7), borderRadius: s(3), backgroundColor: on }) : null}
      </View>
      {zone === 'papers' ? (
        <View style={[styles.papers, { backgroundColor: t.night }]}>
          <Ionicons name="document-text" size={s(22)} color={on} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  papers: { position: 'absolute', right: 4, bottom: 4, borderRadius: 6, padding: 2 },
});
