import {
  cameraWorstCaseBackdrop,
  compositeOver,
  contrastRatio,
  darkPalette,
  lightPalette,
  parseColor,
  type Palette,
} from '@/theme';

const TEXT_MIN = 7;
const NON_TEXT_MIN = 3;

type TextToken = 'textPrimary' | 'textSecondary';
type NonTextToken = 'accent' | 'good' | 'adjust' | 'problem';

const TEXT_TOKENS: TextToken[] = ['textPrimary', 'textSecondary'];
const NON_TEXT_TOKENS: NonTextToken[] = ['accent', 'good', 'adjust', 'problem'];

function backgroundsFor(palette: Palette, includeCameraOverlay: boolean) {
  const backgrounds: { name: string; color: string | ReturnType<typeof compositeOver> }[] = [
    { name: 'background', color: palette.background },
    { name: 'surface', color: palette.surface },
  ];
  if (includeCameraOverlay) {
    backgrounds.push({
      name: 'surfaceOverlay over white camera frame',
      color: compositeOver(palette.surfaceOverlay, cameraWorstCaseBackdrop),
    });
  }
  return backgrounds;
}

const cases: { scheme: string; palette: Palette; cameraOverlay: boolean }[] = [
  // Camera screen is always dark, so only the dark palette is ever drawn over the camera feed.
  { scheme: 'dark', palette: darkPalette, cameraOverlay: true },
  { scheme: 'light', palette: lightPalette, cameraOverlay: false },
];

describe('contrast math', () => {
  it('matches known WCAG values', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('parses hex and rgba', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('rgba(0,0,0,0.6)')).toEqual({ r: 0, g: 0, b: 0, a: 0.6 });
  });

  it('composites alpha over a backdrop', () => {
    expect(compositeOver('rgba(0,0,0,0.5)', '#FFFFFF')).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });
});

describe.each(cases)('$scheme palette', ({ palette, cameraOverlay }) => {
  const backgrounds = backgroundsFor(palette, cameraOverlay);

  for (const token of TEXT_TOKENS) {
    for (const bg of backgrounds) {
      it(`${token} on ${bg.name} is at least ${TEXT_MIN}:1`, () => {
        expect(contrastRatio(palette[token], bg.color)).toBeGreaterThanOrEqual(TEXT_MIN);
      });
    }
  }

  for (const token of NON_TEXT_TOKENS) {
    for (const bg of backgrounds) {
      it(`${token} (icon/border) on ${bg.name} is at least ${NON_TEXT_MIN}:1`, () => {
        expect(contrastRatio(palette[token], bg.color)).toBeGreaterThanOrEqual(NON_TEXT_MIN);
      });
    }
  }

  for (const kind of ['primaryButton', 'secondaryButton'] as const) {
    it(`${kind} label is at least ${TEXT_MIN}:1 on its fill`, () => {
      const b = palette[kind];
      expect(contrastRatio(b.text, b.background)).toBeGreaterThanOrEqual(TEXT_MIN);
    });

    for (const bg of backgrounds) {
      it(`${kind} border on ${bg.name} is at least ${NON_TEXT_MIN}:1`, () => {
        expect(contrastRatio(palette[kind].border, bg.color)).toBeGreaterThanOrEqual(NON_TEXT_MIN);
      });
    }
  }
});
