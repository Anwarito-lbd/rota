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
  clay: string;
  onclay: string;
  claySoft: string;
  plum: string;
  onplum: string;
  plumSoft: string;
}

export const darkPalette: Palette = {
  bg: '#121011',
  surf: '#1B1817',
  surf2: '#242020',
  sink: '#0C0A0B',
  ink: '#F6F1E9',
  ink2: '#B9B0A6',
  ink3: '#968C81',
  line: 'rgba(246,241,233,0.13)',
  line2: 'rgba(246,241,233,0.26)',
  clay: '#E8865F',
  onclay: '#1B1009',
  claySoft: 'rgba(232,134,95,0.16)',
  plum: '#D79BB4',
  onplum: '#22131C',
  plumSoft: 'rgba(215,155,180,0.16)',
};

export const lightPalette: Palette = {
  bg: '#F7F3EC',
  surf: '#FFFDF8',
  surf2: '#EDE6DA',
  sink: '#FFFFFF',
  ink: '#1A1714',
  ink2: '#584F47',
  ink3: '#6E6559',
  line: 'rgba(26,23,20,0.12)',
  line2: 'rgba(26,23,20,0.26)',
  clay: '#A64B2A',
  onclay: '#FFF7F2',
  claySoft: 'rgba(166,75,42,0.10)',
  plum: '#7E3B58',
  onplum: '#FFF4F8',
  plumSoft: 'rgba(126,59,88,0.10)',
};

/** Ink used over photography, where the theme background never applies. */
export const OVER_INK = '#F6F1E9';
export const OVER_INK_SOFT = 'rgba(246,241,233,0.75)';
export const OVER_SCRIM = 'rgba(12,10,11,0.66)';

/**
 * React Native picks a font file, not a weight — each weight is its own family.
 */
export const FONT = {
  sans: 'Archivo_400Regular',
  sansMed: 'Archivo_500Medium',
  sansSemi: 'Archivo_600SemiBold',
  sansBold: 'Archivo_700Bold',
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
} as const;

/** Gradient stops for the feed scrim and the bottom action fades. */
export const FEED_SCRIM = [
  'rgba(12,10,11,0.62)',
  'rgba(12,10,11,0)',
  'rgba(12,10,11,0)',
  'rgba(12,10,11,0.92)',
] as const;

export const HERO_SCRIM = [
  'rgba(12,10,11,0.5)',
  'rgba(12,10,11,0.05)',
  'rgba(12,10,11,0.92)',
  '#0C0A0B',
] as const;
