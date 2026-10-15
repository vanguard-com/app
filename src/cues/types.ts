// Cue engine types. Pure TypeScript, no React or native imports.

import type { HapticPattern } from '@/theme';

/**
 * `system` is for app state the user must hear (recording started, saved, errors, elapsed time).
 * The other four follow the brief's priority order.
 */
export type CueCategory = 'system' | 'framing' | 'lighting' | 'background' | 'feedback';

/** Lower number = higher priority. */
export const CUE_PRIORITY: Record<CueCategory, number> = {
  system: 0,
  framing: 1,
  lighting: 2,
  background: 3,
  feedback: 4,
};

/** Short sounds that confirm an event without words. */
export type Earcon = 'chime' | 'start' | 'stop' | 'saved' | 'thinking' | 'error' | 'listening';

export interface Cue {
  /** Identifies what the cue says, e.g. 'framing.move-left'. Used for the 10 second repeat rule. */
  id: string;
  category: CueCategory;
  /** Words to speak. Omit for sound / haptic only cues. */
  text?: string;
  earcon?: Earcon;
  haptic?: HapticPattern;
  /**
   * User asked for this (e.g. tapped the screen for status): skip the rate limit and the repeat
   * rule, and drop anything already waiting in the same category.
   */
  force?: boolean;
  /** Skip when VoiceOver / TalkBack is on because the screen reader already says the same thing. */
  duplicatesScreenReader?: boolean;
  /**
   * For "all good" cues ("Lighting good"): after it plays once, stay silent until the category
   * changes state, instead of repeating every 10 seconds.
   */
  silentUntilChange?: boolean;
  /** Guidance goes stale quickly; drop the cue if it waited longer than this. */
  maxWaitMs?: number;
  /** Called once the cue has finished playing (or was skipped while being delivered). */
  onFinished?: () => void;
}

export type Verbosity = 'minimal' | 'standard' | 'detailed';

/** Minimum gap between the start of two spoken guidance cues. System cues are not limited. */
export const SPOKEN_CUE_INTERVAL_MS: Record<Verbosity, number> = {
  minimal: 5000,
  standard: 3000,
  detailed: 2000,
};

/** The same cue is not repeated within this window unless its category changed state. */
export const REPEAT_WINDOW_MS = 10_000;

/** Default staleness limit for guidance cues (system cues never go stale). */
export const DEFAULT_GUIDANCE_MAX_WAIT_MS = 4000;
