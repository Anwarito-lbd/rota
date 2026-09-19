import type { CSSProperties } from 'react';

/** Dynamic-Type aware font size: scales with the --ts token. */
export const fs = (px: number) => `calc(${px}px * var(--ts))`;

export const SERIF = "'Instrument Serif', serif";
export const SANS = 'Archivo, system-ui, sans-serif';

/** Fixed ink used over photography, where the theme background never applies. */
export const OVER_INK = '#F6F1E9';
export const OVER_INK_SOFT = 'rgba(246,241,233,0.75)';
export const OVER_SCRIM = 'rgba(12,10,11,0.66)';

/**
 * Figures stay in the sans face with tabular digits — the display serif's
 * numerals read as handwriting at large sizes.
 */
export const amount = (size: number, weight = 700): CSSProperties => ({
  fontFamily: SANS,
  fontSize: size,
  fontWeight: weight,
  lineHeight: 1.05,
  letterSpacing: '-0.02em',
  fontVariantNumeric: 'tabular-nums',
});

export const screen: CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflowY: 'auto',
  background: 'var(--bg)',
  boxSizing: 'border-box',
  animation: 'rotaIn .22s ease',
};

export const card: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  background: 'var(--surf)',
  border: '1px solid var(--line)',
};

export const sectionLabel: CSSProperties = {
  fontSize: fs(12),
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--ink3)',
};

export const display = (size: number): CSSProperties => ({
  fontFamily: SERIF,
  fontSize: size,
  lineHeight: 1.02,
});

export const primaryButton: CSSProperties = {
  cursor: 'pointer',
  width: '100%',
  minHeight: 54,
  fontFamily: SANS,
  fontSize: fs(17),
  fontWeight: 700,
  border: 'none',
  borderRadius: 16,
  background: 'var(--clay)',
  color: 'var(--onclay)',
};

export const secondaryButton: CSSProperties = {
  cursor: 'pointer',
  minHeight: 50,
  fontFamily: SANS,
  fontSize: fs(15),
  fontWeight: 700,
  border: '1px solid var(--line2)',
  borderRadius: 14,
  background: 'none',
  color: 'var(--ink)',
};

/** The bottom action bar that fades the scrolling content out beneath it. */
export const footerBar: CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  padding: '14px 18px 26px',
  background: 'linear-gradient(180deg, rgba(18,16,17,0) 0%, var(--bg) 42%)',
};

export const backButton: CSSProperties = {
  cursor: 'pointer',
  width: 44,
  height: 44,
  flex: '0 0 44px',
  borderRadius: 999,
  border: '1px solid var(--line2)',
  background: 'none',
  fontSize: 18,
  color: 'var(--ink)',
};

/** Selected/unselected pill colouring, used by every chip row in the app. */
export const pickerColors = (on: boolean, tone: 'clay' | 'plum' | 'ink' = 'clay') => {
  const fill = tone === 'plum' ? 'var(--plum)' : tone === 'ink' ? 'var(--ink)' : 'var(--clay)';
  const onFill = tone === 'plum' ? 'var(--onplum)' : tone === 'ink' ? 'var(--bg)' : 'var(--onclay)';
  return {
    background: on ? fill : 'transparent',
    color: on ? onFill : 'var(--ink)',
    borderColor: on ? fill : 'var(--line2)',
  };
};
