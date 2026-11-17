// Line-art car drawings by body type (our own artwork, assets/source/cars/*.svg → PNG). One color, tinted at runtime.
import { Image, type ImageStyle, type StyleProp } from 'react-native';

import type { BodyKind } from '@/core/vehicle/bodyKind';

const ART: Record<BodyKind, number> = {
  sedan: require('../../../assets/images/cars/sedan.png'),
  hatchback: require('../../../assets/images/cars/hatchback.png'),
  suv: require('../../../assets/images/cars/suv.png'),
  pickup: require('../../../assets/images/cars/pickup.png'),
  coupe: require('../../../assets/images/cars/coupe.png'),
  van: require('../../../assets/images/cars/van.png'),
};

/** Drawings are 240×100; give a width and the height follows. Decorative: hidden from screen readers. */
export function CarArt({ kind, width, color, style }: { kind: BodyKind; width: number; color: string; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={ART[kind]}
      accessible={false}
      importantForAccessibility="no"
      resizeMode="contain"
      style={[{ width, height: (width * 100) / 240, tintColor: color }, style]}
    />
  );
}
