// Blue + Ink design tokens. This is the only file allowed to contain colour literals
// (enforced by src/theme/__tests__/noHardcodedColors.test.ts).

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  /** Screen background. */
  background: string;
  /** Cards and secondary buttons. */
  surface: string;
  /** Backing behind any text or icon drawn on the camera feed. Dark palette only in practice. */
  surfaceOverlay: string;
  /** Quiet separators; interactive boundaries use the stronger button border. */
  divider: string;
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

// Dark surfaces are deliberately deeper than the reference's blue-gray cards.
// Blue actions are shared across schemes; status colors keep their own meaning.
export const darkPalette: Palette = {
  background: '#050B14',
  surface: '#101C2E',
  surfaceOverlay: 'rgba(5,11,20,0.94)',
  divider: '#25354D',
  textPrimary: '#F7FAFF',
  textSecondary: '#C0CDDF',
  accent: '#568BFF',
  good: '#34D399',
  adjust: '#FFC83D',
  problem: '#FF808B',
  primaryButton: { background: '#1747C9', text: '#FFFFFF', border: '#568BFF' },
  secondaryButton: { background: '#101C2E', text: '#F7FAFF', border: '#647995' },
};

export const lightPalette: Palette = {
  background: '#FFFFFF',
  surface: '#EEF2F8',
  surfaceOverlay: 'rgba(5,11,20,0.94)',
  divider: '#DCE3EF',
  textPrimary: '#101D35',
  textSecondary: '#3D4D65',
  accent: '#1747C9',
  good: '#05553C',
  adjust: '#805300',
  problem: '#991B1B',
  // A deeper royal blue keeps white action labels at the app's 7:1 text target.
  primaryButton: { background: '#1747C9', text: '#FFFFFF', border: '#1747C9' },
  secondaryButton: { background: '#EEF2F8', text: '#101D35', border: '#7B879C' },
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
  cornerRadius: 12,
  focusRingWidth: 4,
  buttonBorderWidth: 1.5,
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
