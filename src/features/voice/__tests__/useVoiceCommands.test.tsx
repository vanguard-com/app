import { act, renderHook } from '@testing-library/react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { cues } from '@/cues';
import { claimSpeech } from '../speechLease';
import { useVoiceCommands } from '../useVoiceCommands';

jest.mock('@/cues', () => ({
  cues: { isAudioBusy: jest.fn(() => false), onSpeakingChange: jest.fn(() => () => {}) },
}));
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.mocked(cues.isAudioBusy).mockReturnValue(false);
});
afterEach(() => jest.useRealTimers());

it('does not start a microphone after the owning screen unmounts during capability lookup', async () => {
  const { unmount } = renderHook(() => useVoiceCommands(true, jest.fn()));
  unmount();
  await act(async () => {});
  expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
});

it('rechecks cue audio after an asynchronous capability lookup', async () => {
  const { unmount } = renderHook(() => useVoiceCommands(true, jest.fn()));
  jest.mocked(cues.isAudioBusy).mockReturnValue(true);
  await act(async () => {});
  expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
  unmount();
});

it('cannot restart from a native end callback queued before screen unmount', async () => {
  const { unmount } = renderHook(() => useVoiceCommands(true, jest.fn()));
  await act(async () => {});
  const end = jest
    .mocked(useSpeechRecognitionEvent)
    .mock.calls.findLast(([name]) => name === 'end')![1] as (event: object) => void;
  const starts = jest.mocked(ExpoSpeechRecognitionModule.start).mock.calls.length;
  unmount();
  await act(async () => {
    end({});
    jest.advanceTimersByTime(1000);
  });
  expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledTimes(starts);
});

it('rejects playback/file transcripts and late results after a recognizer was aborted', async () => {
  const onCommand = jest.fn();
  const { unmount } = renderHook(() => useVoiceCommands(true, onCommand));
  await act(async () => {});
  const result = jest
    .mocked(useSpeechRecognitionEvent)
    .mock.calls.findLast(([name]) => name === 'result')![1] as (event: unknown) => void;
  let release!: () => void;
  act(() => {
    release = claimSpeech('playback');
  });
  act(() => result({ results: [{ transcript: 'retake video' }] }));
  expect(onCommand).not.toHaveBeenCalled();
  expect(ExpoSpeechRecognitionModule.abort).toHaveBeenCalled();
  act(() => release());
  act(() => result({ results: [{ transcript: 'post video' }] }));
  expect(onCommand).not.toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(400);
  });
  act(() => result({ results: [{ transcript: 'post video' }] }));
  expect(onCommand).toHaveBeenCalledWith({ type: 'postVideo' });
  // Interim and final duplicate results cannot open a second sheet.
  act(() => result({ results: [{ transcript: 'post video' }] }));
  expect(onCommand).toHaveBeenCalledTimes(1);
  unmount();
});
