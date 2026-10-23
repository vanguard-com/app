// Decides which cue plays next. Pure logic with an injected clock so Jest can drive it.
//
// Rules (brief section 7.1):
// - One cue at a time, highest priority first (system, framing, lighting, background, feedback).
// - Spoken guidance at most once per 2 / 3 / 5 seconds (Detailed / Standard / Minimal).
// - The same cue is not repeated within 10 seconds unless its category changed state.

import {
  CUE_PRIORITY,
  DEFAULT_GUIDANCE_MAX_WAIT_MS,
  REPEAT_WINDOW_MS,
  SPOKEN_CUE_INTERVAL_MS,
  type Cue,
  type CueCategory,
  type Verbosity,
} from './types';

interface Pending {
  cue: Cue;
  enqueuedAt: number;
  seq: number;
}

export interface SchedulerOptions {
  verbosity?: Verbosity;
}

export class CueScheduler {
  private pending: Pending[] = [];
  private seq = 0;
  private verbosity: Verbosity;
  private lastSpeechAt = Number.NEGATIVE_INFINITY;
  /** When each cue id was last delivered. */
  private lastDelivered = new Map<string, number>();
  /** Last cue id requested per category, to detect state changes. */
  private lastRequested = new Map<CueCategory, string>();
  /** When each category last changed state (requested a different cue id). */
  private changedAt = new Map<CueCategory, number>();

  constructor({ verbosity = 'standard' }: SchedulerOptions = {}) {
    this.verbosity = verbosity;
  }

  setVerbosity(verbosity: Verbosity): void {
    this.verbosity = verbosity;
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  /**
   * Request a cue. Returns false when the repeat rule drops it straight away.
   * Guidance replaces any older cue still waiting in the same category (only the latest matters);
   * system cues queue in order.
   */
  enqueue(cue: Cue, now: number): boolean {
    if (this.lastRequested.get(cue.category) !== cue.id) {
      this.lastRequested.set(cue.category, cue.id);
      this.changedAt.set(cue.category, now);
    }

    if (!cue.force && this.isRepeat(cue, now)) return false;

    if (cue.force || cue.category !== 'system') {
      this.pending = this.pending.filter((p) => p.cue.category !== cue.category);
    }
    this.pending.push({ cue, enqueuedAt: now, seq: this.seq++ });
    return true;
  }

  /**
   * Take the next cue to deliver, or null if nothing is eligible yet.
   * @param audioBusy speech or an earcon is still playing; only silent (haptic) cues may go.
   */
  next(now: number, audioBusy: boolean): Cue | null {
    this.dropStale(now);
    const ordered = [...this.pending].sort(
      (a, b) => CUE_PRIORITY[a.cue.category] - CUE_PRIORITY[b.cue.category] || a.seq - b.seq,
    );

    for (const item of ordered) {
      const { cue } = item;
      const usesAudio = cue.text !== undefined || cue.earcon !== undefined;
      if (audioBusy && usesAudio) continue;
      if (cue.text !== undefined && !this.speechAllowed(cue, now)) continue;

      this.pending = this.pending.filter((p) => p !== item);
      this.lastDelivered.set(cue.id, now);
      if (cue.text !== undefined) this.lastSpeechAt = now;
      return cue;
    }
    return null;
  }

  /** Earliest time a waiting spoken cue becomes eligible under the rate limit, if any wait. */
  nextEligibleAt(now: number): number | null {
    if (this.pending.length === 0) return null;
    const hasLimited = this.pending.some(
      (p) => p.cue.text !== undefined && p.cue.category !== 'system' && !p.cue.force,
    );
    if (!hasLimited) return now;
    return Math.max(now, this.lastSpeechAt + SPOKEN_CUE_INTERVAL_MS[this.verbosity]);
  }

  /** Drop waiting cues, all or one category (e.g. when recording starts or the mode changes). */
  clear(category?: CueCategory): void {
    this.pending = category ? this.pending.filter((p) => p.cue.category !== category) : [];
  }

  clearIds(ids: readonly string[]): void {
    this.pending = this.pending.filter((p) => !ids.includes(p.cue.id));
  }

  private speechAllowed(cue: Cue, now: number): boolean {
    if (cue.category === 'system' || cue.force) return true;
    return now - this.lastSpeechAt >= SPOKEN_CUE_INTERVAL_MS[this.verbosity];
  }

  private isRepeat(cue: Cue, now: number): boolean {
    const last = this.lastDelivered.get(cue.id);
    if (last === undefined) return false;
    const changed = this.changedAt.get(cue.category) ?? Number.NEGATIVE_INFINITY;
    if (changed > last) return false;
    return cue.silentUntilChange === true || now - last < REPEAT_WINDOW_MS;
  }

  private dropStale(now: number): void {
    this.pending = this.pending.filter(({ cue, enqueuedAt }) => {
      if (cue.category === 'system' || cue.force) return true;
      return now - enqueuedAt <= (cue.maxWaitMs ?? DEFAULT_GUIDANCE_MAX_WAIT_MS);
    });
  }
}
