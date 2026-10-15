// Dependency-free smoke checks for constrained environments; full cases run in Jest/CI.
const assert = require('node:assert/strict');
const { analyseBox, previewBox, FramingTracker, AutoZoom } = require('../src/features/framing/model.ts');
const center = { x: 0.35, y: 0.3, width: 0.3, height: 0.4 };
assert.equal(analyseBox(center, false).state, 'good');
for (const mirrored of [false, true]) {
  const r = analyseBox({ ...center, x: 0.75 }, mirrored);
  assert.equal(r.state, mirrored ? 'left' : 'right');
  assert.equal(Math.sign(r.pan), mirrored ? -1 : 1);
  assert.equal(analyseBox({ ...center, y: 0.02 }, mirrored).state, 'up');
  assert.equal(analyseBox({ ...center, y: 0.7 }, mirrored).state, 'down');
}
const box = previewBox({ x: 10, y: 20, width: 30, height: 40 }, { width: 100, height: 200 }, p => ({ x: 100 - p.y, y: p.x }));
assert.equal(box.x, 0.4);
assert.equal(box.y, 0.05);
assert.ok(Math.abs(box.height - 0.15) < 1e-12);
const tracker = new FramingTracker(0);
tracker.update([{ id: 1, box: center }], 0, false, 0.8);
assert.equal(tracker.update([{ id: 1, box: center }], 250, false, 0.8).state, 'good');
assert.equal(tracker.tick(1250).state, 'searching');
const z = new AutoZoom();
const big = analyseBox({ x: 0, y: 0, width: 1, height: 1 }, false);
assert.equal(z.update(big, 0, 2, { min: 1, max: 4 }, true, true), null);
assert.equal(z.update(big, 1200, 2, { min: 1, max: 4 }, true, true), 1.7);
assert.equal(z.update(big, 5000, 1.7, { min: 1, max: 4 }, true, false), null);
console.log('Framing smoke checks passed (geometry, mirroring, rotation, tracking, zoom).');
