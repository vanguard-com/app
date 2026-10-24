import { storage } from '@/store/storage';
import {
  defaultSettings,
  nextInCycle,
  SETTINGS_STORAGE_KEY,
  stepValue,
  useSettings,
  VOICE_RATE_RANGE,
} from '@/store/settingsStore';

describe('settings store', () => {
  beforeEach(() => {
    useSettings.getState().reset();
  });

  it('retains reviewed access choices and custom sound settings after rehydration', async () => {
    const settings = useSettings.getState();
    settings.update({ permissionsReviewed: true, onboardingComplete: true, voiceRate: 1.5 });
    const saved = storage.getString(SETTINGS_STORAGE_KEY)!;
    settings.reset();
    storage.set(SETTINGS_STORAGE_KEY, saved);
    await useSettings.persist.rehydrate();
    expect(useSettings.getState()).toMatchObject({
      permissionsReviewed: true,
      onboardingComplete: true,
      voiceRate: 1.5,
    });
  });

  it('adds the access-review default when hydrating an older installation', async () => {
    storage.set(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ state: { onboardingComplete: true, voiceRate: 1.5 }, version: 1 }),
    );
    await useSettings.persist.rehydrate();
    expect(useSettings.getState()).toMatchObject({
      onboardingComplete: true,
      voiceRate: 1.5,
      permissionsReviewed: false,
      feedback: { eyeContact: true, expression: true, posture: true, voice: true },
    });
  });

  it('starts with defaults', () => {
    const s = useSettings.getState();
    expect(s.verbosity).toBe('standard');
    expect(s.recordingCues).toBe('earphonesOnly');
    expect(s.sceneModel).toBe('standard');
    expect(s.allowMobileDataDownloads).toBe(false);
  });

  it('updates and persists to MMKV', () => {
    useSettings.getState().update({ verbosity: 'detailed' });
    expect(useSettings.getState().verbosity).toBe('detailed');
    const raw = storage.getString(SETTINGS_STORAGE_KEY);
    expect(raw).toBeDefined();
    expect(JSON.parse(raw!).state.verbosity).toBe('detailed');
  });

  it('does not persist action functions', () => {
    useSettings.getState().update({ autoLens: false });
    const persisted = JSON.parse(storage.getString(SETTINGS_STORAGE_KEY)!).state;
    expect(persisted.update).toBeUndefined();
    expect(Object.keys(persisted).sort()).toEqual(Object.keys(defaultSettings).sort());
  });

  it('toggles single feedback types without touching others', () => {
    useSettings.getState().setFeedback('posture', false);
    expect(useSettings.getState().feedback).toEqual({
      eyeContact: true,
      expression: true,
      posture: false,
      voice: true,
    });
  });
});

describe('nextInCycle', () => {
  const values = ['a', 'b', 'c'] as const;
  it('wraps forward and backward', () => {
    expect(nextInCycle(values, 'c')).toBe('a');
    expect(nextInCycle(values, 'a', -1)).toBe('c');
    expect(nextInCycle(values, 'a')).toBe('b');
  });
});

describe('stepValue', () => {
  it('clamps to range', () => {
    expect(stepValue(2, VOICE_RATE_RANGE, 1)).toBe(2);
    expect(stepValue(0.5, VOICE_RATE_RANGE, -1)).toBe(0.5);
    expect(stepValue(1, VOICE_RATE_RANGE, 1)).toBe(1.25);
  });
});
