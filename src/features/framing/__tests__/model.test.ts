import { analyseBox, AutoZoom, chooseTarget, FramingTracker, previewBox, smoothBox, validBox } from '../model';

const centered = { x: 0.35, y: 0.3, width: 0.3, height: 0.4 };

describe('framing geometry', () => {
  it('accepts only finite positive boxes', () => {
    expect(validBox(centered)).toBe(true);
    expect(validBox({ ...centered, width: 0 })).toBe(false);
    expect(validBox({ ...centered, x: NaN })).toBe(false);
    expect(analyseBox(null, false).state).toBe('searching');
  });
  it('fits the entire box inside the safe zone', () => {
    expect(analyseBox(centered, false).state).toBe('good');
    expect(analyseBox({ ...centered, x: 0.02 }, false).state).toBe('left');
    expect(analyseBox({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, false).state).toBe('good');
  });
  it.each([false, true])('corrects phone directions for mirroring=%s', mirrored => {
    const r = analyseBox({ ...centered, x: 0.75 }, mirrored);
    expect(r.state).toBe(mirrored ? 'left' : 'right');
    expect(Math.sign(r.pan)).toBe(mirrored ? -1 : 1);
    expect(analyseBox({ ...centered, y: 0.02 }, mirrored).state).toBe('up');
    expect(analyseBox({ ...centered, y: 0.7 }, mirrored).state).toBe('down');
  });
  it('uses high pitch for up, low for down and faster beeps nearer centre', () => {
    expect(analyseBox({ ...centered, y: 0 }, false).frequency).toBeGreaterThan(440);
    expect(analyseBox({ ...centered, y: 0.7 }, false).frequency).toBeLessThan(440);
    expect(analyseBox({ ...centered, x: 0.2 }, false).intervalMs).toBeLessThan(analyseBox({ ...centered, x: -0.2 }, false).intervalMs);
  });
  it('reports every clipped edge without clamping the evidence', () => {
    const r = analyseBox({ x: -0.1, y: -0.1, width: 1.2, height: 1.2 }, false);
    expect(r.edges).toEqual(['left', 'right', 'top', 'bottom']);
    expect(r.state).toBe('back');
    expect(r.status).toBe('problem');
  });
  it('asks for distance changes rather than chasing an impossible safe-zone fit', () => {
    expect(analyseBox({ x: 0.05, y: 0.1, width: 0.9, height: 0.8 }, false).state).toBe('back');
    expect(analyseBox({ x: 0.45, y: 0.45, width: 0.1, height: 0.1 }, false).state).toBe('closer');
  });
  it('has an exit tolerance but requires a strict initial fit', () => {
    const b = { ...centered, x: 0.09 };
    expect(analyseBox(b, false, 0.8, true).state).toBe('good');
    expect(analyseBox(b, false, 0.8, false).state).toBe('left');
  });
  it('maps all corners for rotated/cropped previews and preserves out-of-frame edges', () => {
    const mapped = previewBox({ x: 10, y: 20, width: 30, height: 40 }, { width: 100, height: 200 }, p => ({ x: 100 - p.y, y: p.x }));
    expect(mapped?.x).toBeCloseTo(0.4);
    expect(mapped?.y).toBeCloseTo(0.05);
    expect(mapped?.width).toBeCloseTo(0.4);
    expect(mapped?.height).toBeCloseTo(0.15);
    expect(previewBox(centered, { width: 0, height: 0 }, p => p)).toBeNull();
    const b = previewBox({ x: -10, y: 20, width: 30, height: 40 }, { width: 100, height: 100 }, p => p);
    expect(b?.x).toBe(-0.1);
  });
});

describe('stable tracking', () => {
  it('holds the selected ID even when a larger bystander enters', () => {
    const original = { id: 1, box: centered };
    const other = { id: 2, box: { ...centered, width: 0.6 } };
    expect(chooseTarget([other, original], original)).toBe(original);
    expect(chooseTarget([other], original)).toBeNull();
    expect(chooseTarget([other, original], null)).toBe(other);
  });
  it('uses proximity if IDs are unavailable', () => {
    expect(chooseTarget([{ box: { ...centered, x: 0.9 } }], { box: centered })).toBeNull();
    expect(chooseTarget([{ box: centered }], { box: centered })).not.toBeNull();
  });
  it('smooths jitter without overshooting', () => {
    expect(smoothBox(centered, { ...centered, x: 0.45 }).x).toBeCloseTo(0.39);
  });
  it('requires sustained alignment, invalidates stale frames, then reacquires', () => {
    const tracker = new FramingTracker(0);
    const target = { id: 1, box: centered };
    expect(tracker.update([target], 0, false, 0.8).state).toBe('searching');
    expect(tracker.update([target], 250, false, 0.8).state).toBe('good');
    expect(tracker.tick(1249).state).toBe('good');
    expect(tracker.tick(1250).state).toBe('searching');
    tracker.update([{ ...target, id: 2 }], 1300, false, 0.8);
    expect(tracker.update([{ ...target, id: 2 }], 1550, false, 0.8).state).toBe('good');
  });
});

describe('automatic zoom', () => {
  const big = analyseBox({ x: 0, y: 0, width: 1, height: 1 }, false);
  it('requires dwell, obeys cooldown, and clamps to actual controller limits', () => {
    const z = new AutoZoom();
    expect(z.update(big, 0, 2, { min: 1, max: 4 }, true, true)).toBeNull();
    expect(z.update(big, 1199, 2, { min: 1, max: 4 }, true, true)).toBeNull();
    expect(z.update(big, 1200, 2, { min: 1, max: 4 }, true, true)).toBe(1.7);
    expect(z.update(big, 4000, 1.7, { min: 1, max: 4 }, true, true)).toBeNull();
    expect(z.update(big, 4200, 1.05, { min: 1, max: 4 }, true, true)).toBe(1);
  });
  it.each([[false, true], [true, false]])('does nothing when enabled=%s idle=%s', (enabled, idle) => {
    const z = new AutoZoom();
    z.update(big, 0, 2, { min: 1, max: 4 }, enabled, idle);
    expect(z.update(big, 5000, 2, { min: 1, max: 4 }, enabled, idle)).toBeNull();
  });
});
