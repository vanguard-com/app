import { act, renderHook } from '@testing-library/react-native';
import { useVideoOutput, type Recorder } from 'react-native-vision-camera';
import { cues } from '@/cues';
import { useSession } from '@/store/sessionStore';
import { deleteRecording, keepRecording, saveToPhotos } from '../files';
import { useRecorder, type RecorderCallbacks } from '../useRecorder';

jest.mock('@/cues', () => ({ cues: { configure: jest.fn(), clear: jest.fn() } }));
jest.mock('../files', () => ({
  keepRecording: jest.fn(() => 'file:///documents/clip.mp4'),
  saveToPhotos: jest.fn(async () => 'saved'),
  deleteRecording: jest.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

let callbacks: RecorderCallbacks;
let finished: (path: string) => void;
let failed: (error: Error) => void;
let native: Recorder;
let create: jest.Mock;

function mount(mic = false) {
  return renderHook(({ active }: { active: boolean }) => useRecorder(mic, callbacks, active), {
    initialProps: { active: true },
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-24T05:40:00Z'));
  jest.clearAllMocks();
  callbacks = {
    onStarted: jest.fn(),
    onCaptured: jest.fn((x) => x),
    onFinished: jest.fn(),
    onError: jest.fn(),
  };
  useSession.getState().stopRecording();
  useSession.getState().setLastRecording(null);
  native = {
    startRecording: jest.fn(async (done, error) => {
      finished = (path) => done(path, 'stopped');
      failed = error;
    }),
    stopRecording: jest.fn(async () => {}),
    cancelRecording: jest.fn(async () => {}),
  } as unknown as Recorder;
  create = jest.fn(async () => native);
  jest
    .mocked(useVideoOutput)
    .mockReturnValue({ createRecorder: create } as unknown as ReturnType<typeof useVideoOutput>);
  jest
    .mocked(saveToPhotos)
    .mockImplementation(async (_uri, _retry, signal) => (signal?.aborted ? 'denied' : 'saved'));
});

afterEach(() => jest.useRealTimers());

it('does not create or start a recording after leaving during microphone attachment', async () => {
  const scheduled = jest.spyOn(global, 'setTimeout');
  const cleared = jest.spyOn(global, 'clearTimeout');
  const { result, rerender } = mount(true);
  let start!: Promise<void>;
  act(() => {
    start = result.current.start();
  });
  rerender({ active: false });
  await act(async () => {
    jest.advanceTimersByTime(4000);
    await start;
  });
  expect(create).not.toHaveBeenCalled();
  expect(callbacks.onStarted).not.toHaveBeenCalled();
  expect(useSession.getState().recordingPhase).toBe('idle');
  const index = scheduled.mock.calls.findIndex(([, delay]) => delay === 4000);
  expect(index).toBeGreaterThanOrEqual(0);
  expect(cleared).toHaveBeenCalledWith(scheduled.mock.results[index].value);
  scheduled.mockRestore();
  cleared.mockRestore();
});

it('keeps a pending factory owned until it settles, then requires a new Record action', async () => {
  const factory = deferred<Recorder>();
  create.mockReturnValueOnce(factory.promise);
  const { result, rerender } = mount();
  let start!: Promise<void>;
  act(() => {
    start = result.current.start();
  });
  rerender({ active: false });
  rerender({ active: true });
  await act(async () => {
    await result.current.start();
  });
  expect(create).toHaveBeenCalledTimes(1);
  await act(async () => {
    factory.resolve(native);
    await start;
  });
  expect(native.startRecording).not.toHaveBeenCalled();
  expect(useSession.getState().recordingPhase).toBe('idle');
  await act(async () => {
    await result.current.start();
  });
  expect(native.startRecording).toHaveBeenCalledTimes(1);
});

it('cancels a native start that resolves after focus loss without publishing recording state', async () => {
  const starting = deferred<void>();
  jest.mocked(native.startRecording).mockImplementationOnce((done, error) => {
    finished = (path) => done(path, 'stopped');
    failed = error;
    return starting.promise;
  });
  const { result, rerender } = mount();
  let start!: Promise<void>;
  await act(async () => {
    start = result.current.start();
  });
  rerender({ active: false });
  await act(async () => {
    starting.resolve();
    await start;
  });
  expect(native.cancelRecording).toHaveBeenCalledTimes(1);
  expect(callbacks.onStarted).not.toHaveBeenCalled();
  expect(useSession.getState().isRecording).toBe(false);
  await act(async () => {
    finished('/temporary/cancelled.mp4');
  });
  expect(keepRecording).not.toHaveBeenCalled();
  expect(deleteRecording).toHaveBeenCalledWith('file:///temporary/cancelled.mp4');
});

it('does not resurrect an early native error when the start promise subsequently resolves', async () => {
  const starting = deferred<void>();
  jest.mocked(native.startRecording).mockImplementationOnce((_done, error) => {
    error(new Error('camera interrupted'));
    return starting.promise;
  });
  const { result } = mount();
  let start!: Promise<void>;
  await act(async () => {
    start = result.current.start();
  });
  await act(async () => {
    starting.resolve();
    await start;
  });
  expect(callbacks.onError).toHaveBeenCalledTimes(1);
  expect(callbacks.onStarted).not.toHaveBeenCalled();
  expect(useSession.getState().recordingPhase).toBe('idle');
});

it('ignores duplicate terminal callbacks and stale errors from the previous recording', async () => {
  const { result } = mount();
  await act(async () => {
    await result.current.start();
  });
  const oldFailed = failed;
  const oldFinished = finished;
  await act(async () => {
    oldFinished('/temporary/clip.mp4');
  });
  await act(async () => {
    oldFinished('/temporary/clip.mp4');
  });
  expect(keepRecording).toHaveBeenCalledTimes(1);
  expect(saveToPhotos).toHaveBeenCalledTimes(1);
  await act(async () => {
    await result.current.start();
  });
  act(() => oldFailed(new Error('late native event')));
  expect(useSession.getState().recordingPhase).toBe('recording');
  expect(callbacks.onError).not.toHaveBeenCalled();
});

it('cleans microphone waiters and suppresses startup effects after unmount', async () => {
  const { result, unmount } = mount(true);
  let start!: Promise<void>;
  act(() => {
    start = result.current.start();
  });
  unmount();
  await act(async () => {
    jest.advanceTimersByTime(4000);
    await start;
  });
  expect(create).not.toHaveBeenCalled();
  expect(cues.configure).toHaveBeenLastCalledWith({ isRecording: false });
});

it('clears the configuration timeout as soon as the microphone output is confirmed', async () => {
  const scheduled = jest.spyOn(global, 'setTimeout');
  const cleared = jest.spyOn(global, 'clearTimeout');
  const { result } = mount(true);
  let start!: Promise<void>;
  act(() => {
    start = result.current.start();
  });
  await act(async () => {
    result.current.onConfigured();
    await start;
  });
  const index = scheduled.mock.calls.findIndex(([, delay]) => delay === 4000);
  expect(cleared).toHaveBeenCalledWith(scheduled.mock.results[index].value);
  expect(useSession.getState().isRecording).toBe(true);
  scheduled.mockRestore();
  cleared.mockRestore();
});

it('preserves a confirmed recording when backgrounded and waits for focus before opening Review', async () => {
  const { result, rerender } = mount();
  await act(async () => {
    await result.current.start();
  });
  act(() => jest.advanceTimersByTime(1200));
  rerender({ active: false });
  expect(native.stopRecording).toHaveBeenCalledTimes(1);
  expect(native.cancelRecording).not.toHaveBeenCalled();
  await act(async () => {
    finished('/temporary/kept.mp4');
  });
  expect(keepRecording).toHaveBeenCalledWith('/temporary/kept.mp4');
  expect(saveToPhotos).toHaveBeenCalledWith(
    'file:///documents/clip.mp4',
    false,
    expect.objectContaining({ aborted: true }),
  );
  expect(useSession.getState().lastRecording?.durationMs).toBe(1200);
  expect(useSession.getState().lastRecording?.savedToPhotos).toBe(false);
  expect(useSession.getState().lastRecording?.autoSaveResult).toBeUndefined();
  expect(callbacks.onFinished).not.toHaveBeenCalled();
  rerender({ active: true });
  expect(callbacks.onFinished).toHaveBeenCalledTimes(1);
  expect(useSession.getState().isRecording).toBe(false);
});

it('stops a confirmed recording on unmount and preserves the clip without late UI callbacks', async () => {
  const { result, unmount } = mount();
  await act(async () => {
    await result.current.start();
  });
  unmount();
  expect(native.stopRecording).toHaveBeenCalledTimes(1);
  await act(async () => {
    finished('/temporary/kept.mp4');
  });
  expect(useSession.getState().lastRecording?.uri).toBe('file:///documents/clip.mp4');
  expect(callbacks.onCaptured).not.toHaveBeenCalled();
  expect(callbacks.onFinished).not.toHaveBeenCalled();
});

it('uses native stop as a fallback if cancelling a late startup fails', async () => {
  const starting = deferred<void>();
  jest.mocked(native.startRecording).mockReturnValueOnce(starting.promise);
  jest.mocked(native.cancelRecording).mockRejectedValueOnce(new Error('cancel unavailable'));
  const { result, rerender } = mount();
  let start!: Promise<void>;
  await act(async () => {
    start = result.current.start();
  });
  rerender({ active: false });
  await act(async () => {
    starting.resolve();
    await start;
  });
  expect(native.stopRecording).toHaveBeenCalledTimes(1);
  expect(callbacks.onError).not.toHaveBeenCalled();
  expect(useSession.getState().recordingPhase).toBe('idle');
});

it('keeps duration bounded when native completion precedes the start acknowledgement', async () => {
  const starting = deferred<void>();
  jest.mocked(native.startRecording).mockImplementationOnce((done) => {
    done('/temporary/short.mp4', 'max-duration-reached');
    return starting.promise;
  });
  const { result } = mount();
  let start!: Promise<void>;
  await act(async () => {
    start = result.current.start();
  });
  await act(async () => {
    starting.resolve();
    await start;
  });
  expect(useSession.getState().lastRecording?.durationMs).toBe(0);
  expect(callbacks.onCaptured).not.toHaveBeenCalled();
  expect(useSession.getState().recordingPhase).toBe('idle');
  expect(callbacks.onStarted).not.toHaveBeenCalled();
  expect(callbacks.onFinished).toHaveBeenCalledTimes(1);
});

it('rejects queued Record actions while the camera screen is inactive', async () => {
  const { result, rerender } = mount();
  rerender({ active: false });
  await act(async () => {
    await result.current.start();
  });
  expect(create).not.toHaveBeenCalled();
  expect(useSession.getState().recordingPhase).toBe('idle');
});

it('prevents another start until native cancellation has resolved', async () => {
  const starting = deferred<void>();
  const cancelling = deferred<void>();
  jest.mocked(native.startRecording).mockReturnValueOnce(starting.promise);
  jest.mocked(native.cancelRecording).mockReturnValueOnce(cancelling.promise);
  const { result, rerender } = mount();
  let start!: Promise<void>;
  await act(async () => {
    start = result.current.start();
  });
  rerender({ active: false });
  await act(async () => {
    starting.resolve();
  });
  rerender({ active: true });
  await act(async () => {
    await result.current.start();
  });
  expect(create).toHaveBeenCalledTimes(1);
  expect(useSession.getState().recordingPhase).toBe('starting');
  await act(async () => {
    cancelling.resolve();
    await start;
  });
  expect(useSession.getState().recordingPhase).toBe('idle');
  expect(callbacks.onStarted).not.toHaveBeenCalled();
});
