import type { Box } from '@/features/framing/model';
import type { LightingResult } from '@/features/lighting/model';

export interface RecordingSummary {
  framingMeasuredMs: number;
  inFramePercent: number | null;
  lightingMeasuredMs: number;
  goodLightingPercent: number | null;
  darkTailMs: number;
}

/** Aggregate fresh observations only. A stalled detector never fills the rest of a recording. */
class TimedMetric<T> {
  private previous: { value: T; at: number } | null = null;
  measuredMs = 0;
  goodMs = 0;
  tailMs = 0;
  constructor(
    private readonly maxGapMs: number,
    private readonly isGood: (value: T) => boolean,
    private readonly isTail: (value: T) => boolean = () => false,
  ) {}
  sample(value: T | null, at: number) {
    if (!Number.isFinite(at) || (this.previous && at < this.previous.at)) return;
    this.advance(at);
    this.previous = value === null ? null : { value, at };
    if (value === null || !this.isTail(value)) this.tailMs = 0;
  }
  finish(at: number) {
    this.advance(at);
    this.previous = null;
  }
  private advance(at: number) {
    if (!this.previous) return;
    const ms = at - this.previous.at;
    if (ms < 0 || ms > this.maxGapMs) {
      this.tailMs = 0;
      return;
    }
    this.measuredMs += ms;
    if (this.isGood(this.previous.value)) this.goodMs += ms;
    this.tailMs = this.isTail(this.previous.value) ? this.tailMs + ms : 0;
  }
  get percent() {
    return this.measuredMs ? Math.round((100 * this.goodMs) / this.measuredMs) : null;
  }
}

export function fullyInFrame(box: Box | null): boolean {
  return (
    !!box &&
    [box.x, box.y, box.width, box.height].every(Number.isFinite) &&
    box.width > 0 &&
    box.height > 0 &&
    box.x >= 0 &&
    box.y >= 0 &&
    box.x + box.width <= 1 &&
    box.y + box.height <= 1
  );
}

export class RecordingStats {
  private framing = new TimedMetric<boolean>(1000, (v) => v);
  private lighting = new TimedMetric<LightingResult['state']>(
    1500,
    (v) => v === 'good',
    (v) => v === 'dark',
  );
  sampleFraming(box: Box | null, at: number) {
    this.framing.sample(fullyInFrame(box), at);
  }
  sampleLighting(value: LightingResult, at: number) {
    this.lighting.sample(
      value.face === null || ['waiting', 'unavailable', 'needsFace'].includes(value.state)
        ? null
        : value.state,
      at,
    );
  }
  finish(at: number): RecordingSummary {
    this.framing.finish(at);
    this.lighting.finish(at);
    return {
      framingMeasuredMs: this.framing.measuredMs,
      inFramePercent: this.framing.percent,
      lightingMeasuredMs: this.lighting.measuredMs,
      goodLightingPercent: this.lighting.percent,
      darkTailMs: this.lighting.tailMs,
    };
  }
}
