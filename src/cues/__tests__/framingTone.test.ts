import { CueEngine } from '../engine';

describe('framing tone audio policy', () => {
  function setup() {
    const adapters = {
      speech: { speak: jest.fn(), stop: jest.fn() },
      announce: jest.fn(),
      playEarcon: jest.fn(),
      playHaptic: jest.fn(),
      playTone: jest.fn(),
    };
    const engine = new CueEngine(adapters, () => 1000);
    return { engine, adapters };
  }
  it('sends pan and pitch through the shared engine', () => {
    const { engine, adapters } = setup();
    expect(engine.guideTone({ frequency: 600, pan: -0.5, durationS: 0.08 })).toBe(true);
    expect(adapters.playTone).toHaveBeenCalledWith({
      frequency: 600,
      pan: -0.5,
      durationS: 0.08,
      volume: 0.8 * 0.35,
    });
    expect(engine.guideTone({ frequency: 600, pan: 0, durationS: 0.08 })).toBe(false);
    engine.dispose();
  });
  it.each([
    { isRecording: true, recordingCues: 'earphonesOnly' as const, earphonesConnected: false },
    { isRecording: true, recordingCues: 'pause' as const },
    { cueType: 'voice' as const },
  ])('suppresses tones for %s', (patch) => {
    const { engine, adapters } = setup();
    engine.configure(patch);
    expect(engine.guideTone({ frequency: 440, pan: 0, durationS: 0.08 })).toBe(false);
    expect(adapters.playTone).not.toHaveBeenCalled();
    engine.dispose();
  });
  it('stops framing speech when leaving the camera without interrupting system messages', () => {
    const { engine, adapters } = setup();
    engine.say({ id: 'framing.left', category: 'framing', text: 'Move phone left.' });
    engine.clearCategory('framing');
    expect(adapters.speech.stop).toHaveBeenCalledTimes(1);
    engine.say({ id: 'sys.saved', category: 'system', text: 'Saved.' });
    engine.clearCategory('framing');
    expect(adapters.speech.stop).toHaveBeenCalledTimes(1);
    engine.dispose();
  });
});
