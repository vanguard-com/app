import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

import { releaseWhenStopped, stopFileRecognition } from '../recognizerShutdown';

describe('native recognizer shutdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());
  it('does not abort an already ended file session and interfere with the next chunk', async () => {
    jest.mocked(ExpoSpeechRecognitionModule.getStateAsync).mockResolvedValue('inactive');
    expect(await stopFileRecognition()).toBe(true);
    expect(ExpoSpeechRecognitionModule.abort).not.toHaveBeenCalled();
  });
  it('waits for native termination before resuming commands, including a stalled abort', async () => {
    jest.mocked(ExpoSpeechRecognitionModule.getStateAsync).mockResolvedValue('recognizing');
    let ended: (() => void) | undefined;
    jest.mocked(ExpoSpeechRecognitionModule.addListener).mockImplementation((_event, listener) => {
      ended = listener as () => void;
      return { remove: jest.fn() };
    });
    const pending = stopFileRecognition();
    await Promise.resolve();
    expect(ExpoSpeechRecognitionModule.abort).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(5000);
    expect(await pending).toBe(false);
    const release = jest.fn();
    releaseWhenStopped(release);
    await Promise.resolve();
    expect(release).not.toHaveBeenCalled();
    ended!();
    expect(release).toHaveBeenCalledTimes(1);
  });
});
