// Condensed grotesk for headlines, Inter for UI, a mono for VINs and numbers (CLAUDE.md §12).
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import type { TextStyle } from 'react-native';

export const fontAssets = {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  JetBrainsMono_500Medium,
};

export const fonts = {
  display: 'BarlowCondensed_700Bold',
  displaySemi: 'BarlowCondensed_600SemiBold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansBold: 'Inter_600SemiBold',
  mono: 'JetBrainsMono_500Medium',
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 44, lineHeight: 46, letterSpacing: -0.2, textTransform: 'uppercase' },
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30 },
  heading: { fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 24 },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 23 },
  label: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.sansBold, fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase' },
  mono: { fontFamily: fonts.mono, fontSize: 17, lineHeight: 22, letterSpacing: 0.5 },
  number: { fontFamily: fonts.display, fontSize: 28, lineHeight: 30, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;
