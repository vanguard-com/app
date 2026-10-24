import { fireEvent } from '@testing-library/react-native';
import { useRef } from 'react';
import * as Reanimated from 'react-native-reanimated';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { useVideoOutput } from 'react-native-vision-camera';
import { cues } from '@/cues';
import { deleteRecording, keepRecording, saveToPhotos } from '@/features/recording/files';
import { shareRecording } from '@/features/recording/share';
import { useVoiceCommands } from '@/features/voice/useVoiceCommands';
import { isSpeechClaimed } from '@/features/voice/speechLease';
import { useSession } from '@/store/sessionStore';
import { useRecordingHistory } from '@/store/recordingHistory';
import { useSettings } from '@/store/settingsStore';

jest.mock('@/features/voice/useVoiceCommands', () => ({ useVoiceCommands: jest.fn() }));
jest.mock('@/cues/useCueEngineSync', () => ({ useCueEngineSync: jest.fn() }));
jest.mock('@/hooks/useAppActive', () => ({ useAppActive: () => true }));

// Router's test library replaces the global Reanimated mock with one that creates a new shared
// value every render. Foreground camera effects need the stable identity of native shared values.
jest.spyOn(Reanimated, 'useSharedValue').mockImplementation(function useStableValue(initial) {
  const ref = useRef({
    value: initial,
    set(value: unknown) {
      this.value = value;
    },
  });
  return ref.current as unknown as Reanimated.SharedValue<typeof initial>;
});
jest.mock('@/features/recording/files', () => ({
  keepRecording: jest.fn(() => 'file:///documents/clip.mp4'),
  saveToPhotos: jest.fn(async () => 'denied'),
  deleteRecording: jest.fn(),
}));
jest.mock('@/features/recording/share', () => ({ shareRecording: jest.fn(async () => 'opened') }));
jest.mock('@/cues', () => ({
  cues: {
    say: jest.fn(),
    clear: jest.fn(),
    clearCategory: jest.fn(),
    clearIds: jest.fn(),
    guideTone: jest.fn(),
  },
}));

const info = {
  uri: 'file:///documents/clip.mp4',
  durationMs: 12000,
  hasAudio: true,
  savedToPhotos: false,
};
function command(type: Parameters<Parameters<typeof useVoiceCommands>[1]>[0]) {
  act(() => jest.mocked(useVoiceCommands).mock.calls.at(-1)![1](type));
}
beforeEach(() => {
  jest.clearAllMocks();
  useSettings.getState().reset();
  useSettings.getState().update({ onboardingComplete: true });
  useSession.getState().stopRecording();
  useSession.getState().setLastRecording(info);
  useRecordingHistory.setState({ recordings: [info] });
  jest.mocked(saveToPhotos).mockResolvedValue('denied');
  jest.mocked(shareRecording).mockResolvedValue('opened');
});

it('keeps the video before saving to Photos, then reaches Review and hands the local file to sharing', async () => {
  let captured!: (path: string) => Promise<void>;
  const recorder = {
    startRecording: jest.fn(async (done) => {
      captured = done;
    }),
    stopRecording: jest.fn(async () => {}),
  };
  // The global native mock returns a stable output with a mocked recorder factory.
  renderRouter('./app', { initialUrl: '/camera' });
  await act(async () => {});
  const output = jest.mocked(useVideoOutput).mock.results.at(-1)!.value;
  jest
    .mocked(output.createRecorder)
    .mockResolvedValue(recorder as unknown as Awaited<ReturnType<typeof output.createRecorder>>);
  act(() => screen.getByTestId('vision-camera').props.onStarted());
  command({ type: 'focusOn', subject: 'face' });
  expect(useSession.getState().subject).toEqual({ kind: 'face' });
  fireEvent.press(screen.getByTestId('camera-record'));
  await act(async () => {
    screen.getByTestId('vision-camera').props.onConfigured();
  });
  expect(useSession.getState().recordingPhase).toBe('recording');
  fireEvent.press(screen.getByTestId('camera-record'));
  await act(async () => {
    await captured('/temporary/camera.mp4');
  });
  expect(keepRecording).toHaveBeenCalledWith('/temporary/camera.mp4');
  expect(saveToPhotos).toHaveBeenCalledWith(info.uri);
  expect(jest.mocked(keepRecording).mock.invocationCallOrder[0]).toBeLessThan(
    jest.mocked(saveToPhotos).mock.invocationCallOrder[0],
  );
  expect(useSession.getState().lastRecording?.savedToPhotos).toBe(false);
  expect(screen.getByTestId('review-share')).toBeTruthy();
  command({ type: 'postVideo' });
  await act(async () => {});
  expect(shareRecording).toHaveBeenCalledWith(info.uri, expect.any(Function));
  expect(isSpeechClaimed()).toBe(false);
});

it('prevents duplicate sharing and retake while the system sheet owns the file', async () => {
  let finish!: (result: 'opened') => void;
  jest.mocked(shareRecording).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  renderRouter('./app', { initialUrl: '/review' });
  await act(async () => {});
  fireEvent.press(screen.getByTestId('review-share'));
  expect(isSpeechClaimed()).toBe(true);
  command({ type: 'postVideo' });
  command({ type: 'retakeVideo' });
  expect(shareRecording).toHaveBeenCalledTimes(1);
  expect(deleteRecording).not.toHaveBeenCalled();
  expect(screen.getByTestId('review-retake').props.accessibilityState.disabled).toBe(true);
  await act(async () => finish('opened'));
  expect(isSpeechClaimed()).toBe(false);
  expect(useSession.getState().lastRecording?.uri).toBe(info.uri);
});

it('saves once, updates history, and retakes without removing the Photos copy', async () => {
  jest.mocked(saveToPhotos).mockResolvedValue('saved');
  renderRouter('./app', { initialUrl: '/review' });
  await act(async () => {});
  command({ type: 'saveVideo' });
  await act(async () => {});
  expect(useSession.getState().lastRecording?.savedToPhotos).toBe(true);
  expect(useRecordingHistory.getState().recordings[0].savedToPhotos).toBe(true);
  command({ type: 'saveVideo' });
  await act(async () => {});
  expect(saveToPhotos).toHaveBeenCalledTimes(1);
  command({ type: 'retakeVideo' });
  await act(async () => {});
  expect(deleteRecording).toHaveBeenCalledWith(info.uri);
  expect(useSession.getState().lastRecording).toBeNull();
  expect(useRecordingHistory.getState().recordings).toEqual([]);
});

it('cancels a pending share launch if Review unmounts before the sheet opens', async () => {
  let canOpen!: () => boolean;
  let finish!: (result: 'cancelled') => void;
  jest.mocked(shareRecording).mockImplementationOnce((_uri, allowed) => {
    canOpen = allowed!;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  const view = renderRouter('./app', { initialUrl: '/review' });
  await act(async () => {});
  fireEvent.press(screen.getByTestId('review-share'));
  view.unmount();
  expect(canOpen()).toBe(false);
  await act(async () => finish('cancelled'));
  expect(isSpeechClaimed()).toBe(false);
});

it('opens playback with four Review actions and gives contextual voice help', async () => {
  renderRouter('./app', { initialUrl: '/review' });
  await act(async () => {});
  expect(screen.getAllByRole('button')).toHaveLength(4);
  command({ type: 'help' });
  expect(cues.say).toHaveBeenLastCalledWith(
    expect.objectContaining({ text: expect.stringContaining('post video') }),
  );
  command({ type: 'playVideo' });
  await act(async () => {});
  expect(screen.getByTestId('playback-toggle').props.accessibilityLabel).toBe('Pause');
  expect(isSpeechClaimed()).toBe(true);
  fireEvent.press(screen.getByTestId('playback-toggle'));
  expect(isSpeechClaimed()).toBe(false);
});
