import { act, renderHook } from '@testing-library/react-native';
import { useFrameOutput, type CameraRef, type Frame } from 'react-native-vision-camera';
import { loadObjectResources } from '../resources';
import { useBackgroundCamera } from '../useBackgroundCamera';
jest.mock('../resources', () => ({ loadObjectResources: jest.fn() }));
jest.mock('@/cues', () => ({ cues: { say: jest.fn(() => true), clearCategory: jest.fn() } }));
const camera = {
  current: {
    preview: {},
    convertCameraPointToViewPoint: (p: { x: number; y: number }) => ({
      x: p.x * 300,
      y: p.y * 300,
    }),
    convertViewPointToCameraPoint: (p: { x: number; y: number }) => ({
      x: p.x / 300,
      y: p.y / 300,
    }),
  } as unknown as CameraRef,
};
const metadata = {
  width: 300,
  height: 300,
  orientation: 'up',
  isMirrored: false,
  convertFramePointToCameraPoint: (p: { x: number; y: number }) => ({ x: p.x / 300, y: p.y / 300 }),
};
function process(extra: object = {}) {
  const frame = { ...metadata, dispose: jest.fn(), ...extra } as unknown as Frame;
  jest.mocked(useFrameOutput).mock.calls.at(-1)![0]!.onFrame!(frame);
  jest.runAllTicks();
  return frame;
}
function resources() {
  const boxes = new Float32Array(40);
  boxes.set([0.1, 0.1, 0.5, 0.3]);
  const classes = new Float32Array(10);
  classes[0] = 43;
  const scores = new Float32Array(10);
  scores[0] = 0.9;
  const resized = {
    getPixelBuffer: () => new Uint8Array(300 * 300 * 3).buffer,
    dispose: jest.fn(),
  };
  return {
    model: {
      runSync: jest.fn(() => [
        boxes.buffer,
        classes.buffer,
        scores.buffer,
        new Float32Array([1]).buffer,
      ]),
      dispose: jest.fn(),
    },
    resizer: { resize: jest.fn(() => resized), dispose: jest.fn() },
    resized,
  };
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(1000);
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());
it('keeps face callbacks at camera cadence, runs objects once per second and expires stale lists', async () => {
  const native = resources(),
    onFaces = jest.fn();
  jest
    .mocked(loadObjectResources)
    .mockResolvedValue(native as unknown as Awaited<ReturnType<typeof loadObjectResources>>);
  const { result, unmount } = renderHook(() =>
    useBackgroundCamera(camera, true, 'front', { width: 300, height: 300 }, onFaces, true),
  );
  await act(async () => {
    jest.advanceTimersByTime(0);
  });
  act(() => {
    process();
    for (let i = 0; i < 9; i++) {
      jest.advanceTimersByTime(100);
      process();
    }
  });
  expect(native.model.runSync).toHaveBeenCalledTimes(1);
  expect(onFaces).toHaveBeenCalledTimes(10);
  expect(result.current.objects).toEqual([]);
  act(() => {
    jest.advanceTimersByTime(100);
    process();
  });
  expect(native.model.runSync).toHaveBeenCalledTimes(2);
  expect(result.current.summary()).toContain('bottle on the left');
  act(() => jest.advanceTimersByTime(3000));
  expect(result.current.summary()).toContain('Checking');
  expect(result.current.objects).toEqual([]);
  expect(native.resized.dispose).toHaveBeenCalledTimes(2);
  unmount();
});
it('releases frames on inference errors and stops analysis when inactive', async () => {
  const native = resources();
  native.model.runSync.mockImplementation(() => {
    throw new Error('bad model');
  });
  jest
    .mocked(loadObjectResources)
    .mockResolvedValue(native as unknown as Awaited<ReturnType<typeof loadObjectResources>>);
  const { result, rerender, unmount } = renderHook(
    ({ active }: { active: boolean }) =>
      useBackgroundCamera(camera, active, 'front', { width: 300, height: 300 }, jest.fn(), true),
    { initialProps: { active: true } },
  );
  await act(async () => {
    jest.advanceTimersByTime(0);
  });
  let frame!: Frame;
  act(() => {
    frame = process();
  });
  expect(frame.dispose).toHaveBeenCalledTimes(1);
  expect(native.resized.dispose).toHaveBeenCalledTimes(1);
  expect(result.current.status).toBe('unavailable');
  rerender({ active: false });
  act(() => {
    jest.advanceTimersByTime(1000);
    frame = process();
  });
  expect(native.model.runSync).toHaveBeenCalledTimes(1);
  expect(frame.dispose).toHaveBeenCalledTimes(1);
  unmount();
});
