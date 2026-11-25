// Design tokens (CLAUDE.md §12): light-first "workshop" look, white space, thin borders instead of shadows,
// traffic-light colors used sparingly and always with an icon + words.
import { useColorScheme } from 'react-native';

import type { Severity, Verdict } from '@/core/types';

const withAlpha = (hex: string, alpha: number) =>
  hex +
  Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();

const base = {
  brand: '#1F6FEB',
  go: '#16A34A',
  caution: '#F59E0B',
  warn: '#EA580C',
  stop: '#DC2626',
  slate: '#64748B',
};

function palette(scheme: 'light' | 'dark') {
  const light = scheme === 'light';
  const ink = light ? '#15171A' : '#F2F3F4';
  const bg = light ? '#F7F6F2' : '#111315';
  const surface = light ? '#FFFFFF' : '#1B1E21';
  return {
    scheme,
    bg,
    surface,
    /** A recessed surface: inputs, track of bars. */
    sunken: light ? '#EFEDE7' : '#16191C',
    ink,
    muted: withAlpha(ink, 0.6),
    faint: withAlpha(ink, 0.38),
    border: light ? '#E4E1D9' : '#2A2E33',
    borderStrong: light ? '#CFCBC0' : '#3A3F45',
    ...base,
    /** Brand blue is slightly lighter on dark for contrast. */
    brand: light ? base.brand : '#4C8DF6',
    onBrand: '#FFFFFF',
    /** Very light tints behind signal-colored content. */
    tint: {
      brand: withAlpha(base.brand, light ? 0.08 : 0.18),
      go: withAlpha(base.go, light ? 0.1 : 0.2),
      caution: withAlpha(base.caution, light ? 0.14 : 0.22),
      warn: withAlpha(base.warn, light ? 0.1 : 0.2),
      stop: withAlpha(base.stop, light ? 0.08 : 0.2),
      slate: withAlpha(base.slate, light ? 0.1 : 0.22),
    },
    /**
     * "Night road" hero panels (garage, check, onboarding): a deep blue-black that stays dark in both themes,
     * with white line-art cars and road-paint yellow lane marks. Used for a few hero areas only.
     */
    night: light ? '#0E1A2B' : '#0A121E',
    nightRaised: light ? '#182840' : '#142236',
    onNight: '#F4F7FB',
    onNightMuted: 'rgba(244,247,251,0.68)',
    lane: '#FFC83D',
    /** Unlit lamp of the VerdictSignal. */
    lampOff: light ? '#DAD6CC' : '#2C3035',
  };
}

export const themes = { light: palette('light'), dark: palette('dark') };
export type Theme = ReturnType<typeof palette>;
export type SignalColor = 'go' | 'caution' | 'warn' | 'stop' | 'slate' | 'brand';

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? themes.dark : themes.light;
}

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;
export const hairline = 1;
/** Minimum touch target (CLAUDE.md §12 accessibility). */
export const minTouch = 44;

export const verdictColor: Record<Verdict, SignalColor> = {
  WALK_AWAY: 'stop',
  GET_PRO_INSPECTION: 'warn',
  NEGOTIATE: 'caution',
  LOOKS_GOOD_SO_FAR: 'go',
  INCOMPLETE: 'slate',
};

export const severityColor: Record<Severity, SignalColor> = {
  info: 'slate',
  minor: 'caution',
  major: 'warn',
  critical: 'stop',
};
