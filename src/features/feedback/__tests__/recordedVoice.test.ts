import { File } from 'expo-file-system';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

import {
  extractAudio,
  cleanupAudio,
  cancelExtraction,
} from '../../../../modules/lumi-audio-analysis';
import { isSpeechClaimed } from '@/features/voice/speechLease';

import { analyseRecordedVoice } from '../recordedVoice';

jest.mock('../../../../modules/lumi-audio-analysis', () => ({
  extractAudio: jest.fn(),
  cleanupAudio: jest.fn(async () => {}),
  cancelExtraction: jest.fn(),
}));
jest.mock('expo-file-system', () => ({ File: jest.fn() }));

function wav() {
  const bytes = new Uint8Array(44 + 32000 * 2),
    view = new DataView(bytes.buffer);
  const ascii = (at: number, s: string) =>
    [...s].forEach((v, i) => (bytes[at + i] = v.charCodeAt(0)));
  ascii(0, 'RIFF');
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, 64000, true);
  for (let i = 0; i < 32000; i++)
    view.setInt16(44 + i * 2, Math.round(6000 * Math.sin((i * 2 * Math.PI * 200) / 16000)), true);
  return bytes;
}

describe('local recorded voice analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(extractAudio)
      .mockResolvedValue([{ uri: 'file:///chunk.wav', durationMs: 2000, sampleRate: 16000 }]);
    jest.mocked(File).mockImplementation(() => ({ bytes: async () => wav() }) as File);
    jest.mocked(ExpoSpeechRecognitionModule.supportsOnDeviceRecognition).mockReturnValue(false);
  });
  it('computes audio metrics without sending audio to a speech server, then removes temporary audio', async () => {
    const result = await analyseRecordedVoice(
      'file:///video.mp4',
      'job',
      new AbortController().signal,
      jest.fn(),
    );
    expect(result.meanDb).toBeGreaterThan(-30);
    expect(result.wordsPerMinute).toBeNull();
    expect(result.monotone).toBeNull();
    expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
    expect(cleanupAudio).toHaveBeenCalledWith('job');
    expect(isSpeechClaimed()).toBe(false);
  });
  it('cancels native extraction and releases the recognizer lease', async () => {
    let finish!: (value: Awaited<ReturnType<typeof extractAudio>>) => void;
    jest.mocked(extractAudio).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const controller = new AbortController();
    const pending = analyseRecordedVoice(
      'file:///video.mp4',
      'cancel',
      controller.signal,
      jest.fn(),
    );
    controller.abort();
    finish([]);
    await expect(pending).rejects.toThrow('Cancelled');
    expect(cancelExtraction).toHaveBeenCalledWith('cancel');
    expect(cleanupAudio).toHaveBeenCalledWith('cancel');
    expect(isSpeechClaimed()).toBe(false);
  });
  it('cleans up malformed decoded audio without replacing missing metrics with zeros', async () => {
    jest
      .mocked(File)
      .mockImplementationOnce(() => ({ bytes: async () => new Uint8Array(4) }) as File);
    await expect(
      analyseRecordedVoice('file:///bad.mp4', 'bad', new AbortController().signal, jest.fn()),
    ).rejects.toThrow('Invalid WAV');
    expect(cleanupAudio).toHaveBeenCalledWith('bad');
    expect(isSpeechClaimed()).toBe(false);
  });
});
