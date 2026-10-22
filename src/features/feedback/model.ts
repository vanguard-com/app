import { FEEDBACK } from './config';

export interface FaceSample {
  yaw: number;
  pitch: number;
  roll: number;
  smile: number | null;
  eyesVisible: boolean;
}
export interface Keypoint {
  x: number;
  y: number;
  score: number;
}
export type Posture = 'good' | 'tilted' | 'slouching' | 'unknown';
export interface FeedbackObservation {
  eyeContact: boolean | null;
  smiling: boolean | null;
  posture: Posture;
}
export type FeedbackCue = 'lookAtCamera' | 'trySmiling' | 'sitUp' | 'levelHead';

export function observeFace(
  face: FaceSample | null,
): Pick<FeedbackObservation, 'eyeContact' | 'smiling'> {
  if (!face || ![face.yaw, face.pitch, face.roll].every(Number.isFinite))
    return { eyeContact: null, smiling: null };
  return {
    // This is a head-facing estimate, not measured eye gaze.
    eyeContact: face.eyesVisible
      ? Math.abs(face.yaw) <= FEEDBACK.maxYaw && Math.abs(face.pitch) <= FEEDBACK.maxPitch
      : null,
    smiling:
      face.smile === null || !Number.isFinite(face.smile) || face.smile < 0 || face.smile > 1
        ? null
        : face.smile >= FEEDBACK.minSmile
          ? true
          : face.smile <= FEEDBACK.maxNeutral
            ? false
            : null,
  };
}

/** MoveNet 17 keypoints are in an upright square with aspect-preserving padding. */
export function analysePosture(points: readonly Keypoint[]): Posture {
  const valid = (i: number) =>
    points[i] &&
    [points[i].x, points[i].y, points[i].score].every(Number.isFinite) &&
    points[i].score >= FEEDBACK.keypointConfidence &&
    points[i].x >= 0 &&
    points[i].x <= 1 &&
    points[i].y >= 0 &&
    points[i].y <= 1;
  if (points.length !== 17 || ![0, 5, 6].every(valid)) return 'unknown';
  const nose = points[0],
    left = points[5],
    right = points[6];
  const width = Math.hypot(left.x - right.x, left.y - right.y);
  if (width < 0.05) return 'unknown';
  const shoulder = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
  // Ear-line tilt distinguishes tilted heads from a tilted shoulder line.
  if ([3, 4].every(valid)) {
    const dx = Math.abs(points[3].x - points[4].x),
      dy = Math.abs(points[3].y - points[4].y);
    if (dx > 0.02 && (Math.atan2(dy, dx) * 180) / Math.PI > FEEDBACK.headTiltDegrees)
      return 'tilted';
  }
  if (nose.y >= shoulder.y || (shoulder.y - nose.y) / width < FEEDBACK.minNeckShoulderWidths)
    return 'slouching';
  if ([11, 12].every(valid)) {
    const hipX = (points[11].x + points[12].x) / 2;
    const hipY = (points[11].y + points[12].y) / 2;
    if (hipY <= shoulder.y) return 'unknown';
    const expectedX =
      shoulder.x + ((shoulder.x - hipX) * (shoulder.y - nose.y)) / (hipY - shoulder.y);
    if (Math.abs(nose.x - expectedX) / width > FEEDBACK.headOffsetShoulderWidths)
      return 'slouching';
  }
  return 'good';
}

/** Dwell time resets on unknown data, re-identification, disabled toggles or dropped frames. */
export class FeedbackTracker {
  private since = new Map<FeedbackCue, number>();
  private previousAt = -Infinity;
  private identity: number | string | null = null;
  update(
    observation: FeedbackObservation,
    now: number,
    identity: number | string | null,
    toggles: { eyeContact: boolean; expression: boolean; posture: boolean },
    detailed: boolean,
  ): FeedbackCue[] {
    if (now - this.previousAt > FEEDBACK.staleMs || identity !== this.identity) this.since.clear();
    this.previousAt = now;
    this.identity = identity;
    const conditions: [FeedbackCue, boolean, number][] = [
      ['lookAtCamera', toggles.eyeContact && observation.eyeContact === false, FEEDBACK.lookAwayMs],
      [
        'trySmiling',
        toggles.expression && detailed && observation.smiling === false,
        FEEDBACK.neutralMs,
      ],
      ['sitUp', toggles.posture && observation.posture === 'slouching', FEEDBACK.postureMs],
      ['levelHead', toggles.posture && observation.posture === 'tilted', FEEDBACK.postureMs],
    ];
    const cues: FeedbackCue[] = [];
    for (const [key, condition, dwell] of conditions) {
      if (!condition) {
        this.since.delete(key);
        continue;
      }
      if (!this.since.has(key)) this.since.set(key, now);
      if (now - this.since.get(key)! >= dwell) cues.push(key);
    }
    return cues;
  }
  reset() {
    this.since.clear();
    this.previousAt = -Infinity;
    this.identity = null;
  }
}
