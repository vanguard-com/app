import { act, renderRouter, screen } from 'expo-router/testing-library';

import { useSettings } from '@/store/settingsStore';

const INTERACTIVE_ROLES = ['button', 'switch', 'adjustable', 'link'] as const;

// The camera screen has 6 zones defined by the product spec. Every other screen: max 4 controls,
// not counting the Back button.
const SCREENS: { url: string; maxControls: number; minControls?: number }[] = [
  { url: '/welcome', maxControls: 4 },
  { url: '/camera', maxControls: 6 },
  { url: '/subject', maxControls: 4 },
  { url: '/review', maxControls: 4 },
  { url: '/settings', maxControls: 4 },
  { url: '/settings/sound', maxControls: 4 },
  { url: '/settings/feedback', maxControls: 4 },
  { url: '/settings/feedback-types', maxControls: 4 },
  { url: '/settings/recording', maxControls: 4 },
  { url: '/settings/more', maxControls: 4 },
  // About only has the version text (5 taps toggles the hidden debug overlay).
  { url: '/settings/about', maxControls: 4, minControls: 0 },
];

function interactiveElements() {
  return INTERACTIVE_ROLES.flatMap((role) => screen.queryAllByRole(role));
}

describe.each(SCREENS)('$url', ({ url, maxControls, minControls = 1 }) => {
  let pathname = '';
  beforeEach(async () => {
    useSettings.getState().reset();
    useSettings.getState().update({ onboardingComplete: true });
    pathname = renderRouter('./app', { initialUrl: url }).getPathname();
    // Let async permission checks settle so state updates happen inside act().
    await act(async () => {});
  });

  it('renders the expected route', () => {
    expect(pathname).toBe(url);
  });

  it(`has at most ${maxControls} controls besides Back`, () => {
    const controls = interactiveElements().filter((el) => el.props.testID !== 'header-back');
    expect(controls.length).toBeGreaterThanOrEqual(minControls);
    expect(controls.length).toBeLessThanOrEqual(maxControls);
  });

  it('gives every control a label, role and hint', () => {
    for (const el of interactiveElements()) {
      expect(el.props.accessibilityLabel).toEqual(expect.any(String));
      expect(el.props.accessibilityLabel.length).toBeGreaterThan(0);
      expect(el.props.accessibilityRole).toEqual(expect.any(String));
      expect(el.props.accessibilityHint).toEqual(expect.any(String));
      expect(el.props.accessibilityHint.length).toBeGreaterThan(0);
    }
  });
});

describe('first launch', () => {
  it('sends new users to onboarding', () => {
    useSettings.getState().reset();
    expect(renderRouter('./app', { initialUrl: '/' }).getPathname()).toBe('/welcome');
  });

  it('opens the camera once onboarding is complete', async () => {
    useSettings.getState().reset();
    useSettings.getState().update({ onboardingComplete: true });
    expect(renderRouter('./app', { initialUrl: '/' }).getPathname()).toBe('/camera');
    await act(async () => {});
  });
});
