import { analysePosture, FeedbackTracker, observeFace, type Keypoint } from '../model';
import { FeedbackStats } from '../stats';

function pose(): Keypoint[] {
  const p = Array.from({ length: 17 }, () => ({ x: 0.5, y: 0.5, score: 1 }));
  p[0] = { x: 0.5, y: 0.25, score: 1 };
  p[3] = { x: 0.4, y: 0.25, score: 1 };
  p[4] = { x: 0.6, y: 0.25, score: 1 };
  p[5] = { x: 0.3, y: 0.5, score: 1 };
  p[6] = { x: 0.7, y: 0.5, score: 1 };
  p[11] = { x: 0.4, y: 0.8, score: 1 };
  p[12] = { x: 0.6, y: 0.8, score: 1 };
  return p;
}
const bad = { eyeContact: false, smiling: false, posture: 'slouching' as const };
const all = { eyeContact: true, expression: true, posture: true };
describe('live feedback math', () => {
  it('requires visible eyes and valid angles instead of claiming true eye gaze', () => {
    expect(observeFace({ yaw: 0, pitch: 0, roll: 0, smile: 0.8, eyesVisible: true })).toEqual({
      eyeContact: true,
      smiling: true,
    });
    expect(observeFace({ yaw: 30, pitch: 0, roll: 0, smile: 0.1, eyesVisible: true })).toEqual({
      eyeContact: false,
      smiling: false,
    });
    expect(observeFace({ yaw: 0, pitch: 0, roll: 0, smile: -1, eyesVisible: false })).toEqual({
      eyeContact: null,
      smiling: null,
    });
    expect(observeFace(null).eyeContact).toBeNull();
    expect(
      observeFace({ yaw: NaN, pitch: 0, roll: 0, smile: 0.8, eyesVisible: true }).eyeContact,
    ).toBeNull();
  });
  it('distinguishes upright, tilted, slouching and unavailable pose', () => {
    expect(analysePosture(pose())).toBe('good');
    const tilted = pose();
    tilted[4].y = 0.36;
    expect(analysePosture(tilted)).toBe('tilted');
    const slouch = pose();
    slouch[0].y = 0.46;
    expect(analysePosture(slouch)).toBe('slouching');
    const hidden = pose();
    hidden[5].score = 0.1;
    expect(analysePosture(hidden)).toBe('unknown');
    expect(analysePosture([])).toBe('unknown');
  });
  it('waits three seconds and resets on unknown samples or changed identity', () => {
    const tracker = new FeedbackTracker();
    for (let at = 0; at < 3000; at += 200)
      expect(tracker.update(bad, at, 1, all, true)).not.toContain('lookAtCamera');
    expect(tracker.update(bad, 3000, 1, all, true)).toEqual(['lookAtCamera', 'sitUp']);
    expect(tracker.update(bad, 3200, 2, all, true)).toEqual([]);
    tracker.update({ eyeContact: null, smiling: null, posture: 'unknown' }, 3400, 2, all, true);
    expect(tracker.update(bad, 3600, 2, all, true)).toEqual([]);
    expect(tracker.update(bad, 6000, 2, all, true)).toEqual([]);
  });
  it('never prompts smiling outside Detailed verbosity or when its toggle is off', () => {
    const tracker = new FeedbackTracker();
    for (let at = 0; at <= 16000; at += 200)
      expect(tracker.update(bad, at, 1, all, false)).not.toContain('trySmiling');
    for (let at = 16200; at <= 32000; at += 200)
      expect(tracker.update(bad, at, 1, { ...all, expression: false }, true)).not.toContain(
        'trySmiling',
      );
    tracker.reset();
    let cues: string[] = [];
    for (let at = 0; at <= 15000; at += 200) cues = tracker.update(bad, at, 1, all, true);
    expect(cues).toContain('trySmiling');
  });
  it('counts only observed time and keeps unmeasured metrics null', () => {
    const stats = new FeedbackStats();
    stats.sample({ eyeContact: true, smiling: null, posture: 'unknown' }, 0);
    stats.sample({ eyeContact: false, smiling: null, posture: 'unknown' }, 500);
    stats.sample({ eyeContact: null, smiling: null, posture: 'unknown' }, 1000);
    const result = stats.finish(10_000);
    expect(result.eyeContactPercent).toBe(50);
    expect(result.eyeMeasuredMs).toBe(1000);
    expect(result.smilingPercent).toBeNull();
    expect(result.goodPosturePercent).toBeNull();
  });
});
