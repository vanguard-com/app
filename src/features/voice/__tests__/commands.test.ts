import { normalizeTranscript, parseCommand } from '@/features/voice/commands';
import { en } from '@/i18n/en';

describe('parseCommand', () => {
  it.each([
    ['Start recording', 'startRecording'],
    ['okay begin recording now', 'startRecording'],
    ['start video', 'startRecording'],
    ['Stop recording.', 'stopRecording'],
    ['stop the video', 'stopRecording'],
    ['switch camera', 'switchCamera'],
    ['change the camera', 'switchCamera'],
    ['use the other camera', 'switchCamera'],
    ['save video', 'saveVideo'],
    ['save my video', 'saveVideo'],
    ['retake video', 'retakeVideo'],
    ['record it again', 'retakeVideo'],
    ['post video', 'postVideo'],
    ['share my video', 'postVideo'],
    ['play my video', 'playVideo'],
    ['pause the video', 'pauseVideo'],
    ['restart video', 'restartVideo'],
    ['check lighting', 'checkLighting'],
    ['find light', 'findLight'],
    ["What's behind me?", 'whatIsBehindMe'],
    ['what is behind me', 'whatIsBehindMe'],
    ['describe my background', 'describeBackground'],
    ['install detailed mode', 'installDetailedMode'],
    ['help', 'help'],
    ['what can I say', 'help'],
  ])('"%s" -> %s', (transcript, type) => {
    expect(parseCommand(transcript)?.type).toBe(type);
  });

  it('prefers stop over start when both appear', () => {
    expect(parseCommand('stop recording')?.type).toBe('stopRecording');
  });

  it('parses feedback on and off', () => {
    expect(parseCommand('feedback on')).toEqual({ type: 'feedback', on: true });
    expect(parseCommand('turn off feedback')).toEqual({ type: 'feedback', on: false });
  });

  it('parses cancellation of a light scan without matching its button label', () => {
    expect(parseCommand('cancel light scan')).toEqual({ type: 'cancelLightScan' });
    expect(parseCommand('stop the light scan')).toEqual({ type: 'cancelLightScan' });
    expect(parseCommand('Cancel scan')).toBeNull();
  });

  it('parses the subject in focus on', () => {
    expect(parseCommand('focus on the mug')).toEqual({ type: 'focusOn', subject: 'mug' });
    expect(parseCommand('Focus on my laptop')).toEqual({ type: 'focusOn', subject: 'laptop' });
  });

  it('parses scene model switching', () => {
    expect(parseCommand('use detailed mode')).toEqual({ type: 'useSceneModel', model: 'detailed' });
    expect(parseCommand('use standard mode')).toEqual({ type: 'useSceneModel', model: 'standard' });
  });

  it.each([
    '',
    'hello there',
    'I need some help with this',
    'record',
    'save',
    'retake',
    'starts recording',
    'recording stopped',
  ])('ignores "%s"', (transcript) => {
    expect(parseCommand(transcript)).toBeNull();
  });

  it('normalizes punctuation and case', () => {
    expect(normalizeTranscript('  Start, RECORDING!! ')).toBe('start recording');
  });
});

// VoiceOver / TalkBack read labels and hints out loud through the loudspeaker. If the microphone
// picked one up and it contained a command phrase, Lumi would act on its own UI.
describe('UI text never contains a command phrase', () => {
  // Spoken only while the recognizer is paused, so these may name commands.
  const ALLOWED = ['voice.help'];

  function collect(value: unknown, path: string, out: { path: string; text: string }[]) {
    if (typeof value === 'string') out.push({ path, text: value });
    else if (typeof value === 'function') {
      const sample = (value as (...args: unknown[]) => unknown)('X', 'Y', 'Z');
      collect(sample, path, out);
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        collect(child, path ? `${path}.${key}` : key, out);
      }
    }
  }

  const texts: { path: string; text: string }[] = [];
  collect(en, '', texts);

  it('found strings to check', () => {
    expect(texts.length).toBeGreaterThan(50);
  });

  it.each(
    texts
      .filter((t) => !ALLOWED.some((p) => t.path === p || t.path.startsWith(`${p}.`)))
      .map((t) => [t.path, t.text]),
  )('%s', (_path, text) => {
    expect(parseCommand(text)).toBeNull();
  });
});
