import { LIGHTING } from './config';

/** Signed clockwise turn in degrees, independent of the sensor's wrap boundary. */
export function angleDelta(target: number, current: number): number {
  return ((((target - current + 540) % 360) + 360) % 360) - 180;
}

export type ScanPhase = 'idle' | 'scanning' | 'guiding' | 'done' | 'failed';
export interface ScanResult {
  phase: ScanPhase;
  progress: number;
  turn: number;
}

export class LightScan {
  private started = 0;
  private previous: number | null = null;
  private unwrapped = 0;
  private min = 0;
  private max = 0;
  private sensorAt = -Infinity;
  private bins = new Map<number, { total: number; count: number }>();
  private target = 0;
  private alignedAt: number | null = null;
  result: ScanResult = { phase: 'idle', progress: 0, turn: 0 };
  start(now: number) {
    this.started = now;
    this.previous = null;
    this.unwrapped = 0;
    this.min = 0;
    this.max = 0;
    this.sensorAt = -Infinity;
    this.bins.clear();
    this.alignedAt = null;
    this.result = { phase: 'scanning', progress: 0, turn: 0 };
  }
  heading(degrees: number, now: number): ScanResult {
    if (!Number.isFinite(degrees) || !['scanning', 'guiding'].includes(this.result.phase))
      return this.result;
    if (this.previous !== null) {
      const step = angleDelta(degrees, this.previous);
      // A reset/discontinuous sensor is not a physical turn; fail rather than invent a direction.
      if (Math.abs(step) > 45) return this.fail();
      this.unwrapped += step;
    }
    this.previous = degrees;
    this.sensorAt = now;
    this.min = Math.min(this.min, this.unwrapped);
    this.max = Math.max(this.max, this.unwrapped);
    if (this.result.phase === 'guiding') {
      const turn = angleDelta(this.target, degrees);
      if (Math.abs(turn) <= LIGHTING.alignmentDegrees) {
        this.alignedAt ??= now;
        if (now - this.alignedAt >= LIGHTING.alignmentMs)
          this.result = { ...this.result, phase: 'done', turn: 0 };
      } else this.alignedAt = null;
      if (this.result.phase !== 'done') this.result = { ...this.result, turn };
    }
    return this.result;
  }
  sample(brightness: number, now: number): ScanResult {
    if (
      this.result.phase !== 'scanning' ||
      this.previous === null ||
      now - this.sensorAt > 250 ||
      !Number.isFinite(brightness) ||
      brightness < 0 ||
      brightness > 255
    )
      return this.result;
    const bin = Math.floor((((this.previous % 360) + 360) % 360) / LIGHTING.scanBinDegrees);
    const entry = this.bins.get(bin) ?? { total: 0, count: 0 };
    this.bins.set(bin, { total: entry.total + brightness, count: entry.count + 1 });
    this.result = { ...this.result, progress: Math.min(1, this.bins.size / 36) };
    // Repeated rocking must not count as a full sweep. Require both spatial coverage and travel.
    if (this.max - this.min >= 340 && this.bins.size >= LIGHTING.scanCoverageBins) {
      const best = [...this.bins].sort(
        (a, b) => b[1].total / b[1].count - a[1].total / a[1].count,
      )[0];
      const worst = Math.min(...[...this.bins.values()].map((v) => v.total / v.count));
      if (
        best[1].total / best[1].count < LIGHTING.dark ||
        best[1].total / best[1].count - worst < 10
      )
        return this.fail();
      this.target = (best[0] + 0.5) * LIGHTING.scanBinDegrees;
      this.result = { phase: 'guiding', progress: 1, turn: angleDelta(this.target, this.previous) };
    }
    return this.result;
  }
  tick(now: number): ScanResult {
    if (
      ['scanning', 'guiding'].includes(this.result.phase) &&
      (now - this.started > LIGHTING.scanTimeoutMs ||
        (now - this.started > 2000 && now - this.sensorAt > LIGHTING.sensorStaleMs))
    )
      this.fail();
    return this.result;
  }
  cancel() {
    this.result = { phase: 'idle', progress: 0, turn: 0 };
  }
  private fail() {
    this.result = { phase: 'failed', progress: 0, turn: 0 };
    return this.result;
  }
}
