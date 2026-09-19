import { useMemo } from 'react';
import type { TextStyle } from 'react-native';
import { useStore } from '../state/store';
import { FONT, darkPalette, lightPalette, type Palette } from './tokens';

export interface Theme {
  c: Palette;
  dark: boolean;
  /** Dynamic-Type aware size: mirrors the web build's --ts token. */
  fs: (n: number) => number;
  /** Figures: sans face with tabular digits, never the display serif. */
  amount: (size: number, weight?: 'bold' | 'semi') => TextStyle;
}

export function useTheme(): Theme {
  const { state, theme } = useStore();
  const dark = theme === 'dark';
  const scale = state.textLg ? 1.16 : 1;

  return useMemo(() => {
    const fs = (n: number) => Math.round(n * scale);
    return {
      c: dark ? darkPalette : lightPalette,
      dark,
      fs,
      amount: (size: number, weight: 'bold' | 'semi' = 'bold') => ({
        fontFamily: weight === 'bold' ? FONT.sansBold : FONT.sansSemi,
        fontSize: size,
        lineHeight: Math.round(size * 1.08),
        letterSpacing: -0.4,
        fontVariant: ['tabular-nums'],
      }),
    };
  }, [dark, scale]);
}
