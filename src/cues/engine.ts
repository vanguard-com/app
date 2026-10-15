// Cue engine: one queue, one voice, several output channels.
// Native players are injected as adapters so this file stays testable in Jest.

import type { HapticPattern } from '@/theme';

import { earconDurationMs } from './earcons';
import { channelPolicy, type ChannelInputs, type SpeechRoute } from './policy';
import { CueScheduler } from './scheduler';
import type { Cue, Earcon, Verbosity } from './types';

export interface SpeechAdapter {
  speak(text: string, options: { rate: number; volume: number; onDone: () => void }): void;
  stop(): void;
}

export interface CueAdapters {
  speech: SpeechAdapter;
  /** VoiceOver / TalkBack announcement. */
  announce(text: string): void;
  playEarcon(earcon: Earcon, volume: number): void;
  playHaptic(pattern: HapticPattern): void;
  playTone?(options: { frequency: number; pan: number; durationS: number; volume: number }): void;
}

export interface EngineState extends ChannelInputs {
  verbosity: Verbosity;
  /** Speech rate multiplier, 1 = normal. */
  voiceRate: number;
  /** 0..1 */
  cueVolume: number;
}

export const DEFAULT_ENGINE_STATE: EngineState = {
  verbosity: 'standard',
  voiceRate: 1,
  cueVolume: 0.8,
  isRecording: false,
  recordingCues: 'earphonesOnly',
  earphonesConnected: false,
  cueType: 'both',
  screenReaderOn: false,
};

// Screen readers give no "finished" callback, so estimate how long an announcement takes.
const ANNOUNCE_MS_PER_CHAR = 65;
const ANNOUNCE_MIN_MS = 900;
// Safety net in case the speech engine never reports that it finished.
const SPEECH_TIMEOUT_MS_PER_CHAR = 150;
const SPEECH_TIMEOUT_MIN_MS = 3000;

export class CueEngine {
  private scheduler = new CueScheduler();
  private state: EngineState = DEFAULT_ENGINE_STATE;
  private audioBusyUntil = 0;
  private speaking = false;
  private pumpTimer: ReturnType<typeof setTimeout> | null = null;
  private speechTimeout: ReturnType<typeof setTimeout> | null = null;
  private delayedSpeech: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<(speaking: boolean) => void>();

  constructor(
    private adapters: CueAdapters,
    private now: () => number = Date.now,
  ) {}

  configure(patch: Partial<EngineState>): void {
    this.state = { ...this.state, ...patch };
    this.scheduler.setVerbosity(this.state.verbosity);
    this.pump();
  }

  getState(): EngineState {
    return this.state;
  }

  /** Short framing beep, admitted by the same channel policy and audio lock as queued cues. */
  guideTone(options: { frequency: number; pan: number; durationS: number }): boolean {
    if (
      !channelPolicy(this.state).tones ||
      this.isAudioBusy() ||
      this.scheduler.pendingCount > 0 ||
      !this.adapters.playTone
    )
      return false;
    this.adapters.playTone({ ...options, volume: this.state.cueVolume * 0.35 });
    this.audioBusyUntil = this.now() + options.durationS * 1000 + 20;
    return true;
  }

  clearCategory(category: Cue['category']): void {
    this.scheduler.clear(category);
  }

  /** Request a cue. Returns false if the repeat rule dropped it. */
  say(cue: Cue): boolean {
    if (cue.force) this.interrupt();
    const accepted = this.scheduler.enqueue(cue, this.now());
    if (!accepted) cue.onFinished?.();
    this.pump();
    return accepted;
  }

  /** Stop current speech and drop waiting cues (all, or guidance only). */
  clear(scope: 'all' | 'guidance' = 'all'): void {
    if (scope === 'all') this.scheduler.clear();
    else {
      this.scheduler.clear('framing');
      this.scheduler.clear('lighting');
      this.scheduler.clear('background');
      this.scheduler.clear('feedback');
    }
    this.interrupt();
  }

  /** True while Lumi is speaking or playing an earcon (voice commands ignore this time). */
  isAudioBusy(): boolean {
    return this.speaking || this.now() < this.audioBusyUntil;
  }

  onSpeakingChange(listener: (speaking: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.clear();
    if (this.pumpTimer) clearTimeout(this.pumpTimer);
    this.listeners.clear();
  }

  private interrupt(): void {
    if (this.delayedSpeech) clearTimeout(this.delayedSpeech);
    this.delayedSpeech = null;
    if (this.speaking) this.adapters.speech.stop();
    this.finishSpeech();
    this.audioBusyUntil = 0;
  }

  private pump = (): void => {
    if (this.pumpTimer) clearTimeout(this.pumpTimer);
    this.pumpTimer = null;

    let cue = this.scheduler.next(this.now(), this.isAudioBusy());
    while (cue) {
      this.deliver(cue);
      cue = this.scheduler.next(this.now(), this.isAudioBusy());
    }

    if (this.scheduler.pendingCount === 0) return;
    const now = this.now();
    const eligibleAt = this.scheduler.nextEligibleAt(now) ?? now;
    const busyUntil = this.isAudioBusy() ? Math.max(this.audioBusyUntil, now + 100) : now;
    const wait = Math.max(eligibleAt, busyUntil) - now;
    this.pumpTimer = setTimeout(this.pump, Math.max(50, wait));
  };

  private deliver(cue: Cue): void {
    const policy = channelPolicy(this.state);
    const now = this.now();
    const finished = once(cue.onFinished);

    if (cue.haptic && cue.haptic !== 'none' && policy.haptics) {
      this.adapters.playHaptic(cue.haptic);
    }

    let speechDelay = 0;
    if (cue.earcon && policy.earcons) {
      this.adapters.playEarcon(cue.earcon, this.state.cueVolume);
      speechDelay = earconDurationMs(cue.earcon);
      this.audioBusyUntil = Math.max(this.audioBusyUntil, now + speechDelay);
    }

    const route: SpeechRoute =
      cue.category === 'system' ? policy.systemSpeech : policy.guidanceSpeech;
    const skipSpeech =
      cue.text === undefined ||
      route === 'off' ||
      (cue.duplicatesScreenReader === true && this.state.screenReaderOn);
    if (skipSpeech || cue.text === undefined) {
      setTimeout(finished, speechDelay);
      return;
    }

    const text = cue.text;
    if (route === 'screenReader') {
      const duration = Math.max(ANNOUNCE_MIN_MS, text.length * ANNOUNCE_MS_PER_CHAR);
      this.audioBusyUntil = Math.max(this.audioBusyUntil, now + speechDelay + duration);
      this.runAfter(speechDelay, () => this.adapters.announce(text));
      setTimeout(finished, speechDelay + duration);
      return;
    }

    this.setSpeaking(true);
    this.runAfter(speechDelay, () => {
      this.adapters.speech.speak(text, {
        rate: this.state.voiceRate,
        volume: this.state.cueVolume,
        onDone: () => {
          this.finishSpeech();
          finished();
          this.pump();
        },
      });
      this.speechTimeout = setTimeout(
        () => {
          this.finishSpeech();
          finished();
          this.pump();
        },
        Math.max(SPEECH_TIMEOUT_MIN_MS, text.length * SPEECH_TIMEOUT_MS_PER_CHAR),
      );
    });
  }

  private runAfter(delayMs: number, fn: () => void): void {
    if (delayMs <= 0) {
      fn();
      return;
    }
    this.delayedSpeech = setTimeout(() => {
      this.delayedSpeech = null;
      fn();
    }, delayMs);
  }

  private finishSpeech(): void {
    if (this.speechTimeout) clearTimeout(this.speechTimeout);
    this.speechTimeout = null;
    this.setSpeaking(false);
  }

  private setSpeaking(value: boolean): void {
    if (this.speaking === value) return;
    this.speaking = value;
    for (const listener of this.listeners) listener(value);
  }
}

function once(fn: (() => void) | undefined): () => void {
  let called = false;
  return () => {
    if (called || !fn) return;
    called = true;
    fn();
  };
}
