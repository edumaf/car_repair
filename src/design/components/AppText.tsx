import { Text, type TextProps } from 'react-native';

import { useTheme, type Theme } from '../tokens';
import { type, type TypeVariant } from '../typography';

type Tone = 'ink' | 'muted' | 'faint' | 'brand' | 'go' | 'caution' | 'warn' | 'stop' | 'slate' | 'onBrand';

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  tone?: Tone;
  align?: 'left' | 'center' | 'right';
}

const toneColor = (t: Theme, tone: Tone) => (tone === 'caution' && t.scheme === 'light' ? '#B45309' : t[tone]);

/** All text goes through this, so fonts, colors and system font scaling stay consistent. */
export function AppText({ variant = 'body', tone = 'ink', align, style, ...rest }: AppTextProps) {
  const t = useTheme();
  return <Text {...rest} style={[type[variant], { color: toneColor(t, tone), textAlign: align }, style]} />;
}
