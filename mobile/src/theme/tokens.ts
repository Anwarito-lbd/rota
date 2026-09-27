import { Platform, type TextStyle } from 'react-native';

export interface Palette {
  bg: string;
  surf: string;
  surf2: string;
  sink: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  line2: string;
  /** Rota lavender — the brand colour, from the hanger logo. */
  accent: string;
  /** Ink that sits on the accent. */
  onAccent: string;
  accentSoft: string;
  /** Secondary tone for alerts, unread marks and destructive actions. */
  plum: string;
  onplum: string;
  plumSoft: string;
}

export const BRAND_LAVENDER = '#E2A9F1';

export const darkPalette: Palette = {
  bg: '#121013',
  surf: '#1B181D',
  surf2: '#251F29',
  sink: '#0C0A0D',
  ink: '#F7F2F8',
  ink2: '#BCB2C2',
  ink3: '#978CA0',
  line: 'rgba(247,242,248,0.13)',
  line2: 'rgba(247,242,248,0.26)',
  accent: BRAND_LAVENDER,
  onAccent: '#2A1033',
  accentSoft: 'rgba(226,169,241,0.16)',
  plum: '#F2A0C4',
  onplum: '#2A1320',
  plumSoft: 'rgba(242,160,196,0.16)',
};

export const lightPalette: Palette = {
  bg: '#F8F4FA',
  surf: '#FFFFFF',
  surf2: '#EFE7F4',
  sink: '#FFFFFF',
  ink: '#1A1420',
  ink2: '#564C5E',
  ink3: '#6E6478',
  line: 'rgba(26,20,32,0.12)',
  line2: 'rgba(26,20,32,0.26)',
  // The brand lavender is too pale for text on a light ground, so the light
  // theme uses a deeper shade of the same hue and keeps the pale one for fills.
  accent: '#8E3FB0',
  onAccent: '#FFF6FE',
  accentSoft: 'rgba(226,169,241,0.22)',
  plum: '#A83B6E',
  onplum: '#FFF4F8',
  plumSoft: 'rgba(168,59,110,0.10)',
};

/** Ink used over photography, where the theme background never applies. */
export const OVER_INK = '#F7F2F8';
export const OVER_INK_SOFT = 'rgba(247,242,248,0.75)';
export const OVER_SCRIM = 'rgba(12,10,13,0.66)';

/**
 * Type, per the Figma redesign ("Rota — iOS redesign" → Tokens): the system
 * font (SF Pro on iOS, Roboto on Android) for every UI role, and Instrument
 * Serif only for short brand lines.
 */
const SYSTEM = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Inter, "Segoe UI", Roboto, system-ui, sans-serif',
});

export type FontWeight = 'reg' | 'med' | 'semi' | 'bold';
const WEIGHTS: Record<FontWeight, TextStyle['fontWeight']> = { reg: '400', med: '500', semi: '600', bold: '700' };

/** System font at a weight — spread into a text style. */
export function ff(weight: FontWeight = 'reg'): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  return { fontFamily: SYSTEM, fontWeight: WEIGHTS[weight] };
}

export const FONT = {
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
} as const;

/** Figma type roles (pt). */
export const TYPE = {
  largeTitle: 34,
  title: 28,
  headline: 17,
  body: 17,
  caption: 12,
} as const;

/** Corner radii from the Figma tokens. */
export const RADIUS = { sm: 8, md: 12, lg: 20, xl: 28, pill: 999 } as const;

/** Gradient stops for the feed scrim and the bottom action fades. */
export const FEED_SCRIM = [
  'rgba(12,10,13,0.62)',
  'rgba(12,10,13,0)',
  'rgba(12,10,13,0)',
  'rgba(12,10,13,0.92)',
] as const;

export const HERO_SCRIM = [
  'rgba(12,10,13,0.5)',
  'rgba(12,10,13,0.05)',
  'rgba(12,10,13,0.92)',
  '#0C0A0D',
] as const;
