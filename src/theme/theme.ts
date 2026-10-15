// Night + Amber design tokens. This is the only file allowed to contain colour literals
// (enforced by src/theme/__tests__/noHardcodedColors.test.ts).

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  /** Screen background. */
  background: string;
  /** Cards and secondary buttons. */
  surface: string;
  /** Backing behind any text or icon drawn on the camera feed. Dark palette only in practice. */
  surfaceOverlay: string;
  textPrimary: string;
  textSecondary: string;
  /** Brand colour: record button, focus ring. Never used for text in light mode. */
  accent: string;
  good: string;
  adjust: string;
  problem: string;
  /** Primary action button (record, confirm). */
  primaryButton: { background: string; text: string; border: string };
  /** Secondary button (everything else). */
  secondaryButton: { background: string; text: string; border: string };
}

export const darkPalette: Palette = {
  background: '#0B0B0F',
  surface: '#1C1C22',
  // Spec value was 0.6. Over a white camera feed that gives white text only 5.7:1 and secondary
  // text 3.4:1. 0.8 keeps every text token at 7:1 or more even over a fully white frame.
  surfaceOverlay: 'rgba(0,0,0,0.8)',
  textPrimary: '#FFFFFF',
  textSecondary: '#C7C7CC',
  accent: '#FFC83D',
  good: '#34D399',
  adjust: '#FFC83D',
  problem: '#FF6B6B',
  primaryButton: { background: '#FFC83D', text: '#0B0B0F', border: '#FFC83D' },
  secondaryButton: { background: '#1C1C22', text: '#FFFFFF', border: '#C7C7CC' },
};

export const lightPalette: Palette = {
  background: '#FFFFFF',
  surface: '#F2F2F5',
  surfaceOverlay: 'rgba(0,0,0,0.8)',
  textPrimary: '#111111',
  textSecondary: '#3C3C43',
  accent: '#8A5A00',
  good: '#05553C',
  adjust: '#8A5A00',
  problem: '#991B1B',
  // No colour reaches 7:1 on #8A5A00, so light mode primary buttons use an accent border instead
  // of an accent fill.
  primaryButton: { background: '#F2F2F5', text: '#111111', border: '#8A5A00' },
  secondaryButton: { background: '#F2F2F5', text: '#111111', border: '#3C3C43' },
};

export const palettes: Record<ColorScheme, Palette> = {
  dark: darkPalette,
  light: lightPalette,
};

/** Worst case backdrop for anything drawn on the live camera feed (a fully white frame). */
export const cameraWorstCaseBackdrop = '#FFFFFF';

export const typography = {
  // Minimum 17 pt everywhere. Text scales with the phone's text size setting (no max multiplier).
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' as const },
  label: { fontSize: 17, lineHeight: 24, fontWeight: '600' as const },
  status: { fontSize: 20, lineHeight: 28, fontWeight: '600' as const },
  heading: { fontSize: 22, lineHeight: 30, fontWeight: '600' as const },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '700' as const },
  timer: { fontSize: 22, lineHeight: 30, fontWeight: '700' as const },
} as const;

export const MIN_FONT_SIZE = 17;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const layout = {
  /** Minimum touch target, in points. */
  minTouchTarget: 60,
  recordButtonSize: 96,
  cornerRadius: 16,
  focusRingWidth: 4,
  buttonBorderWidth: 2,
} as const;

export type Status = 'good' | 'adjust' | 'problem';

export type HapticPattern = 'none' | 'single' | 'double';

export interface StatusVisual {
  colorToken: 'good' | 'adjust' | 'problem';
  /** RN has no double border, so `double` is drawn as two nested solid borders. */
  borderStyle: 'solid' | 'dashed' | 'double';
  borderWidth: number;
  icon: string;
  haptic: HapticPattern;
}

// Colour is never the only signal: each status also differs by border style, icon and haptic.
export const statusVisuals: Record<Status, StatusVisual> = {
  good: { colorToken: 'good', borderStyle: 'solid', borderWidth: 10, icon: '✓', haptic: 'single' },
  adjust: {
    colorToken: 'adjust',
    borderStyle: 'dashed',
    borderWidth: 6,
    icon: '↔',
    haptic: 'none',
  },
  problem: {
    colorToken: 'problem',
    borderStyle: 'double',
    borderWidth: 6,
    icon: '!',
    haptic: 'double',
  },
};

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  typography: typeof typography;
  spacing: typeof spacing;
  layout: typeof layout;
}

export function getTheme(scheme: ColorScheme): Theme {
  return { scheme, colors: palettes[scheme], typography, spacing, layout };
}
