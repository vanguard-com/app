import { earconDurationMs } from '@/cues/earcons';
import { CueEngine, type CueAdapters } from '@/cues/engine';

function makeAdapters() {
  const spoken: string[] = [];
  const announced: string[] = [];
  const earcons: string[] = [];
  const haptics: string[] = [];
  let finish: (() => void) | null = null;
  const adapters: CueAdapters = {
    speech: {
      speak: jest.fn((text, { onDone }) => {
        spoken.push(text);
        finish = onDone;
      }),
      stop: jest.fn(() => {
        finish = null;
      }),
    },
    announce: (text) => announced.push(text),
    playEarcon: (e) => earcons.push(e),
    playHaptic: (p) => haptics.push(p),
  };
  return {
    adapters,
    spoken,
    announced,
    earcons,
    haptics,
    finishSpeech: () => finish?.(),
  };
}

describe('CueEngine', () => {
  it('clearing resolved background warnings preserves a requested scene description', () => {
    const t = makeAdapters();
    const engine = new CueEngine(t.adapters);
    engine.say({ id: 'scene.description', category: 'background', text: 'A shelf beside a lamp.' });
    engine.clearIds(['background.bright', 'background.person', 'background.clutter']);
    expect(t.adapters.speech.stop).not.toHaveBeenCalled();
    expect(engine.isAudioBusy()).toBe(true);
    engine.clearIds(['scene.description']);
    expect(t.adapters.speech.stop).toHaveBeenCalledTimes(1);
    expect(engine.isAudioBusy()).toBe(false);
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('speaks one cue at a time and starts the next only after the first finishes', () => {
    const t = makeAdapters();
    const engine = new CueEngine(t.adapters);
    engine.say({ id: 'sys.a', category: 'system', text: 'Recording' });
    engine.say({ id: 'sys.b', category: 'system', text: '30 seconds' });
    expect(t.spoken).toEqual(['Recording']);
    expect(engine.isAudioBusy()).toBe(true);
    t.finishSpeech();
    expect(t.spoken).toEqual(['Recording', '30 seconds']);
  });

  it('waits for the rate limit before the next spoken guidance cue', () => {
    const t = makeAdapters();
    const engine = new CueEngine(t.adapters);
    engine.say({ id: 'framing.left', category: 'framing', text: 'Move left' });
    t.finishSpeech();
    engine.say({ id: 'lighting.dark', category: 'lighting', text: 'Too dark' });
    expect(t.spoken).toEqual(['Move left']);
    jest.advanceTimersByTime(3000);
    expect(t.spoken).toEqual(['Move left', 'Too dark']);
  });

  it('plays the earcon first, then speaks after it ends', () => {
    const t = makeAdapters();
    const engine = new CueEngine(t.adapters);
    engine.say({ id: 'sys.start', category: 'system', earcon: 'start', text: 'Recording' });
    expect(t.earcons).toEqual(['start']);
    expect(t.spoken).toEqual([]);
    jest.advanceTimersByTime(earconDurationMs('start'));
    expect(t.spoken).toEqual(['Recording']);
  });

  it('uses vibration only while recording without earphones (earphones only mode)', () => {
    const t = makeAdapters();
    const engine = new CueEngine(t.adapters);
    engine.configure({ isRecording: true, earphonesConnected: false });
    engine.say({
      id: 'framing.cut',
      category: 'framing',
      text: 'Top of head cut off',
      earcon: 'error',
      haptic: 'double',
    });
    expect(t.spoken).toEqual([]);
    expect(t.earcons).toEqual([]);
    expect(t.haptics).toEqual(['double']);
  });

  it('routes words through VoiceOver / TalkBack when a screen reader is on', () => {
    const t = makeAdapters();
    const engine = new CueEngine(t.adapters);
    engine.configure({ screenReaderOn: true });
    engine.say({ id: 'sys.saved', category: 'system', text: 'Saved to Photos' });
    expect(t.announced).toEqual(['Saved to Photos']);
    expect(t.spoken).toEqual([]);
  });

  it('skips cues the screen reader already speaks', () => {
    const t = makeAdapters();
    const engine = new CueEngine(t.adapters);
    engine.configure({ screenReaderOn: true });
    engine.say({
      id: 'sys.mode',
      category: 'system',
      text: 'Lighting',
      haptic: 'single',
      duplicatesScreenReader: true,
    });
    expect(t.announced).toEqual([]);
    expect(t.haptics).toEqual(['single']);
  });

  it('a forced cue (status tap) interrupts current speech', () => {
    const t = makeAdapters();
    const engine = new CueEngine(t.adapters);
    engine.say({ id: 'framing.left', category: 'framing', text: 'Move left' });
    engine.say({ id: 'status', category: 'system', text: 'Camera ready', force: true });
    expect(t.adapters.speech.stop).toHaveBeenCalled();
    expect(t.spoken).toEqual(['Move left', 'Camera ready']);
  });

  it('recovers if the speech engine never reports that it finished', () => {
    const t = makeAdapters();
    const engine = new CueEngine(t.adapters);
    engine.say({ id: 'sys.a', category: 'system', text: 'Hello' });
    engine.say({ id: 'sys.b', category: 'system', text: 'Again' });
    jest.advanceTimersByTime(3000);
    expect(t.spoken).toEqual(['Hello', 'Again']);
  });

  it('notifies speaking listeners', () => {
    const t = makeAdapters();
    const engine = new CueEngine(t.adapters);
    const changes: boolean[] = [];
    engine.onSpeakingChange((s) => changes.push(s));
    engine.say({ id: 'sys.a', category: 'system', text: 'Hello' });
    t.finishSpeech();
    expect(changes).toEqual([true, false]);
  });
});

describe('CueEngine onFinished', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });
  afterEach(() => jest.useRealTimers());

  it('fires after speech finishes', () => {
    const t = makeAdapters();
    const engine = new CueEngine(t.adapters);
    const done = jest.fn();
    engine.say({ id: 'sys.a', category: 'system', text: 'Hello', onFinished: done });
    expect(done).not.toHaveBeenCalled();
    t.finishSpeech();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('fires when speech is skipped (recording without earphones)', () => {
    const t = makeAdapters();
    const engine = new CueEngine(t.adapters);
    engine.configure({ isRecording: true });
    const done = jest.fn();
    engine.say({ id: 'sys.a', category: 'system', text: 'Hello', onFinished: done });
    jest.advanceTimersByTime(0);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('fires immediately when the repeat rule drops the cue', () => {
    const t = makeAdapters();
    const engine = new CueEngine(t.adapters);
    engine.say({ id: 'g', category: 'framing', text: 'Move left' });
    t.finishSpeech();
    const done = jest.fn();
    engine.say({ id: 'g', category: 'framing', text: 'Move left', onFinished: done });
    expect(done).toHaveBeenCalledTimes(1);
  });
});
