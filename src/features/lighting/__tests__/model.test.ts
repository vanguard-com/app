import { analyseLighting, LightingTracker, luminance } from '../model';

const face = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
const grid = (f: (x: number, y: number) => number) =>
  Array.from({ length: 32 * 32 }, (_, i) =>
    f(((i % 32) + 0.5) / 32, (Math.floor(i / 32) + 0.5) / 32),
  );
const inFace = (x: number, y: number) => x >= 0.25 && x <= 0.75 && y >= 0.25 && y <= 0.75;

describe('lighting measurements', () => {
  it.each([
    [255, 0, 0, 76.245],
    [0, 255, 0, 149.685],
    [0, 0, 255, 29.07],
    [120, 120, 120, 120],
  ])('uses luminance coefficients for %s,%s,%s', (r, g, b, y) =>
    expect(luminance(r, g, b)).toBeCloseTo(y),
  );
  it('recognizes evenly lit face and background', () => {
    expect(
      analyseLighting(
        grid(() => 130),
        32,
        face,
      ),
    ).toEqual({ state: 'good', face: 130, background: 130, overall: 130 });
  });
  it('recognizes a dark room', () =>
    expect(
      analyseLighting(
        grid(() => 20),
        32,
        face,
      ).state,
    ).toBe('dark'));
  it('compares background with the face rather than just overall brightness', () => {
    const pixels = grid((x, y) => (inFace(x, y) ? 50 : 200));
    const result = analyseLighting(pixels, 32, face);
    expect(result.state).toBe('backlit');
    expect(result.face).toBe(50);
    expect(result.background).toBe(200);
  });
  it.each([
    ['shadowLeft', (x: number) => x < 0.5],
    ['shadowRight', (x: number) => x > 0.5],
    ['shadowTop', (_x: number, y: number) => y < 0.5],
    ['shadowBottom', (_x: number, y: number) => y > 0.5],
  ] as const)('detects %s in the visible face', (state, shadow) => {
    const pixels = grid((x, y) => (inFace(x, y) && shadow(x, y) ? 60 : 140));
    expect(analyseLighting(pixels, 32, face).state).toBe(state);
  });
  it('does not invent face quality without enough face pixels', () => {
    expect(
      analyseLighting(
        grid(() => 120),
        32,
        null,
      ).state,
    ).toBe('needsFace');
    expect(
      analyseLighting(
        grid(() => 120),
        32,
        { x: 0.5, y: 0.5, width: 0.01, height: 0.01 },
      ).state,
    ).toBe('needsFace');
    expect(
      analyseLighting(
        grid(() => 20),
        32,
        null,
      ).state,
    ).toBe('dark');
  });
  it('handles cropped face bounds and no remaining background', () => {
    expect(
      analyseLighting(
        grid(() => 120),
        32,
        { x: -0.2, y: -0.2, width: 1.4, height: 1.4 },
      ),
    ).toMatchObject({ state: 'good', background: null });
  });
  it.each([[], [NaN], Array(1024).fill(256), Array(1024).fill(-1)].map((pixels) => ({ pixels })))(
    'rejects invalid samples',
    ({ pixels }) => expect(analyseLighting(pixels, 32, face).state).toBe('unavailable'),
  );
  it('requires sustained measurements and invalidates stale good results', () => {
    const tracker = new LightingTracker();
    const good = analyseLighting(
      grid(() => 130),
      32,
      face,
    );
    expect(tracker.update(good, 0).state).toBe('waiting');
    expect(tracker.update(good, 500).state).toBe('waiting');
    expect(tracker.update(good, 1000).state).toBe('good');
    expect(tracker.tick(2600).state).toBe('unavailable');
  });
});
