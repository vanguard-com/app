import type { FeedbackObservation } from './model';

export interface FeedbackSummary {
  observedMs: number;
  eyeContactPercent: number | null;
  smilingPercent: number | null;
  goodPosturePercent: number | null;
  eyeMeasuredMs: number;
  expressionMeasuredMs: number;
  postureMeasuredMs: number;
}
export class FeedbackStats {
  private previous: { at: number; value: FeedbackObservation } | null = null;
  private totals = {
    eye: 0,
    smile: 0,
    posture: 0,
    eyeGood: 0,
    smileGood: 0,
    postureGood: 0,
    observed: 0,
  };
  sample(value: FeedbackObservation, now: number) {
    if (this.previous) {
      const ms = now - this.previous.at;
      if (ms >= 0 && ms <= 1000) {
        const previous = this.previous.value;
        this.totals.observed += ms;
        if (previous.eyeContact !== null) {
          this.totals.eye += ms;
          if (previous.eyeContact) this.totals.eyeGood += ms;
        }
        if (previous.smiling !== null) {
          this.totals.smile += ms;
          if (previous.smiling) this.totals.smileGood += ms;
        }
        if (previous.posture !== 'unknown') {
          this.totals.posture += ms;
          if (previous.posture === 'good') this.totals.postureGood += ms;
        }
      }
    }
    this.previous = { at: now, value };
  }
  finish(now: number): FeedbackSummary {
    if (this.previous) this.sample(this.previous.value, now);
    const t = this.totals;
    const percentage = (good: number, total: number) =>
      total ? Math.round((100 * good) / total) : null;
    return {
      observedMs: t.observed,
      eyeContactPercent: percentage(t.eyeGood, t.eye),
      smilingPercent: percentage(t.smileGood, t.smile),
      goodPosturePercent: percentage(t.postureGood, t.posture),
      eyeMeasuredMs: t.eye,
      expressionMeasuredMs: t.smile,
      postureMeasuredMs: t.posture,
    };
  }
}
