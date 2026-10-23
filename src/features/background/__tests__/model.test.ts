import {
  ObjectTracker,
  backgroundWarnings,
  containsFace,
  parseDetections,
  position,
  type Detection,
  type TrackedObject,
} from '../model';
const bottle: Detection = {
  label: 'bottle',
  box: { x: 0.1, y: 0.1, width: 0.15, height: 0.3 },
  score: 0.9,
};
function outputs(label = 43, confidence = 0.8) {
  const boxes = new Float32Array(40);
  boxes.set([0.1, 0.2, 0.5, 0.6]);
  const classes = new Float32Array(10);
  classes[0] = label;
  const scores = new Float32Array(10);
  scores[0] = confidence;
  return [boxes.buffer, classes.buffer, scores.buffer, new Float32Array([1]).buffer];
}
describe('bundled COCO output contract', () => {
  it('uses sparse zero-based COCO ids and ymin,xmin,ymax,xmax', () => {
    expect(parseDetections(outputs())).toEqual([
      {
        label: 'bottle',
        score: expect.closeTo(0.8),
        box: {
          x: expect.closeTo(0.2),
          y: expect.closeTo(0.1),
          width: expect.closeTo(0.4),
          height: expect.closeTo(0.4),
        },
      },
    ]);
    expect(parseDetections(outputs(0))[0].label).toBe('person');
  });
  it('rejects malformed tensors, unknown classes, low scores and NaN coordinates', () => {
    expect(parseDetections([])).toEqual([]);
    expect(parseDetections(outputs(11))).toEqual([]);
    expect(parseDetections(outputs(999))).toEqual([]);
    expect(parseDetections(outputs(43, 0.4))).toEqual([]);
    const bad = outputs();
    new Float32Array(bad[0])[0] = NaN;
    expect(parseDetections(bad)).toEqual([]);
  });
});
describe('stable background list', () => {
  it('requires two observations and expires missing objects', () => {
    const tracker = new ObjectTracker();
    expect(tracker.update([bottle], 0)).toEqual([]);
    const confirmed = tracker.update([bottle], 1000);
    expect(confirmed).toHaveLength(1);
    expect(tracker.current(3501)).toEqual([]);
    expect(tracker.update([bottle], 4000)).toEqual([]);
  });
  it('matches each same-class object once and keeps positions separate', () => {
    const tracker = new ObjectTracker(),
      right = { ...bottle, box: { ...bottle.box, x: 0.8 } };
    tracker.update([bottle, right], 0);
    const next = tracker.update([right, bottle], 1000);
    expect(new Set(next.map((t) => t.id)).size).toBe(2);
    expect(next.map((t) => position(t.box))).toEqual(['right', 'left']);
  });
  it('excludes the person containing the selected face', () => {
    expect(
      containsFace(
        { x: 0, y: 0, width: 1, height: 1 },
        { x: 0.4, y: 0.2, width: 0.2, height: 0.2 },
      ),
    ).toBe(true);
    expect(containsFace(bottle.box, { x: 0.7, y: 0.7, width: 0.1, height: 0.1 })).toBe(false);
  });
});
describe('priority 3 warning evidence', () => {
  const face = { x: 0.4, y: 0.3, width: 0.2, height: 0.2 };
  const tracked = (patch: Partial<TrackedObject> = {}): TrackedObject => ({
    ...bottle,
    id: 1,
    seen: 2,
    first: 0,
    last: 1000,
    originX: 0.175,
    ...patch,
  });
  it('requires a selected face for backlight and does not identify windows', () => {
    expect(backgroundWarnings([], null, true, 1000)).toEqual([]);
    expect(backgroundWarnings([], face, true, 1000)).toEqual(['bright']);
  });
  it('does not warn about the presenter or stationary bystanders', () => {
    expect(
      backgroundWarnings(
        [tracked({ label: 'person', box: { x: 0, y: 0, width: 1, height: 1 } })],
        face,
        false,
        1000,
      ),
    ).toEqual([]);
    expect(backgroundWarnings([tracked({ label: 'person' })], face, false, 1000)).toEqual([]);
  });
  it('warns for a newly observed moving person outside the presenter', () => {
    expect(
      backgroundWarnings([tracked({ label: 'person', originX: 0.05 })], face, false, 1000),
    ).toEqual(['person']);
    expect(
      backgroundWarnings([tracked({ label: 'person', originX: 0.05, last: 0 })], face, false, 3000),
    ).toEqual([]);
  });
  it('requires at least three objects close to the face', () => {
    const clutter = [1, 2, 3].map((id) =>
      tracked({ id, box: { x: 0.35 + id * 0.02, y: 0.3, width: 0.1, height: 0.15 } }),
    );
    expect(backgroundWarnings(clutter.slice(0, 2), face, false, 1000)).toEqual([]);
    expect(backgroundWarnings(clutter, face, false, 1000)).toEqual(['clutter']);
  });
});
