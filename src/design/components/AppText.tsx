import { Children, type ReactNode } from 'react';
import { Text, type TextProps } from 'react-native';

import { useTheme, type Theme } from '../tokens';
import { type, type TypeVariant } from '../typography';
import { tr } from '@/core/i18n/i18n';

type Tone = 'ink' | 'muted' | 'faint' | 'brand' | 'go' | 'caution' | 'warn' | 'stop' | 'slate' | 'onBrand' | 'onNight' | 'onNightMuted' | 'lane';

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  tone?: Tone;
  align?: 'left' | 'center' | 'right';
}

const toneColor = (t: Theme, tone: Tone) => (tone === 'caution' && t.scheme === 'light' ? '#B45309' : t[tone]);

/** Translates plain string children (the English text is the key, see core/i18n). */
function translate(children: ReactNode): ReactNode {
  if (typeof children === 'string') return tr(children);
  if (Array.isArray(children)) return Children.map(children, (c) => (typeof c === 'string' ? tr(c) : c));
  return children;
}

/** All text goes through this, so fonts, colors, system font scaling and translation stay consistent. */
export function AppText({ variant = 'body', tone = 'ink', align, style, children, ...rest }: AppTextProps) {
  const t = useTheme();
  // Huge display headlines still grow with the system text size, but capped so they can't push the screen apart.
  const maxScale = rest.maxFontSizeMultiplier ?? (variant === 'hero' ? 1.3 : variant === 'display' ? 1.6 : undefined);
  return (
    <Text {...rest} maxFontSizeMultiplier={maxScale} style={[type[variant], { color: toneColor(t, tone), textAlign: align }, style]}>
      {translate(children)}
    </Text>
  );
}
