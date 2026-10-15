import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from './storage';

export type Verbosity = 'minimal' | 'standard' | 'detailed';
export type CueType = 'tone' | 'voice' | 'both';
export type RecordingCueMode = 'earphonesOnly' | 'pause' | 'always';
export type SceneModel = 'standard' | 'detailed';
export type ElapsedTimeInterval = 0 | 30 | 60;

export interface FeedbackToggles {
  eyeContact: boolean;
  expression: boolean;
  posture: boolean;
  voice: boolean;
}

export interface Settings {
  verbosity: Verbosity;
  liveFeedback: boolean;
  feedback: FeedbackToggles;
  cueType: CueType;
  /** Speech rate multiplier passed to TTS. 1 = normal. */
  voiceRate: number;
  /** 0..1 */
  cueVolume: number;
  recordingCues: RecordingCueMode;
  autoLens: boolean;
  /** Seconds between spoken elapsed time while recording. 0 = off. */
  elapsedTimeInterval: ElapsedTimeInterval;
  voiceCommandsWhileRecording: boolean;
  sceneModel: SceneModel;
  allowMobileDataDownloads: boolean;
  /** Fraction of the frame (centred) the subject should stay inside. */
  safeZone: number;
  debugOverlay: boolean;
  onboardingComplete: boolean;
}

export const VOICE_RATE_RANGE = { min: 0.5, max: 2, step: 0.25 } as const;
export const CUE_VOLUME_RANGE = { min: 0.1, max: 1, step: 0.1 } as const;

export const defaultSettings: Settings = {
  verbosity: 'standard',
  liveFeedback: false,
  feedback: { eyeContact: true, expression: true, posture: true, voice: true },
  cueType: 'both',
  voiceRate: 1,
  cueVolume: 0.8,
  // Cues played on the loudspeaker would be recorded into the video, so default to earphones only.
  recordingCues: 'earphonesOnly',
  autoLens: true,
  elapsedTimeInterval: 30,
  voiceCommandsWhileRecording: false,
  sceneModel: 'standard',
  allowMobileDataDownloads: false,
  safeZone: 0.8,
  debugOverlay: false,
  onboardingComplete: false,
};

interface SettingsActions {
  update: (patch: Partial<Settings>) => void;
  setFeedback: (key: keyof FeedbackToggles, value: boolean) => void;
  reset: () => void;
}

export type SettingsState = Settings & SettingsActions;

export const SETTINGS_STORAGE_KEY = 'settings';
const SETTINGS_VERSION = 1;

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      update: (patch) => set(patch),
      setFeedback: (key, value) => set((s) => ({ feedback: { ...s.feedback, [key]: value } })),
      reset: () => set(defaultSettings),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: SETTINGS_VERSION,
      storage: createJSONStorage(() => zustandStorage),
      partialize: ({ update: _u, setFeedback: _f, reset: _r, ...settings }) => settings,
      // Fill in any settings added in later versions with their defaults.
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<Settings>),
        feedback: { ...current.feedback, ...(persisted as Partial<Settings>)?.feedback },
      }),
    },
  ),
);

/** Cycle to the next value in a list (used by adjustable controls). */
export function nextInCycle<T>(values: readonly T[], current: T, direction: 1 | -1 = 1): T {
  const i = values.indexOf(current);
  const n = values.length;
  return values[(((i + direction) % n) + n) % n];
}

/** Step a number within a range, clamped, rounded to avoid float drift. */
export function stepValue(
  value: number,
  range: { min: number; max: number; step: number },
  direction: 1 | -1,
): number {
  const next = Math.min(range.max, Math.max(range.min, value + direction * range.step));
  return Math.round(next * 100) / 100;
}
