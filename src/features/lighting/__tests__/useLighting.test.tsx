import { act, renderHook } from '@testing-library/react-native';
import { useFrameOutput, type CameraRef, type Frame } from 'react-native-vision-camera';
import { createFaceDetector } from 'react-native-vision-camera-face-detector';

import { cues } from '@/cues';

import { useLighting } from '../useLighting';

jest.mock('@/cues', () => ({ cues: { say: jest.fn(), clearCategory: jest.fn() } }));

describe('lighting frame pipeline', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1000);
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());
  const camera = {
    current: {
      preview: {},
      convertViewPointToCameraPoint: (p: { x: number; y: number }) => ({
        x: p.x / 100,
        y: p.y / 100,
      }),
      convertCameraPointToViewPoint: (p: { x: number; y: number }) => ({
        x: p.x * 100,
        y: p.y * 100,
      }),
    } as unknown as CameraRef,
  };
  function frame(value = 120) {
    return {
      isPlanar: true,
      pixelFormat: 'yuv-420-8-bit-full',
      getPlanes: () => [
        {
          width: 32,
          height: 32,
          bytesPerRow: 32,
          getPixelBuffer: () => new Uint8Array(1024).fill(value).buffer,
        },
      ],
      convertCameraPointToFramePoint: (p: { x: number; y: number }) => ({
        x: p.x * 32,
        y: p.y * 32,
      }),
      dispose: jest.fn(),
    } as unknown as Frame;
  }
  const process = (f: Frame) => {
    jest.mocked(useFrameOutput).mock.calls.at(-1)![0]!.onFrame!(f);
    jest.runAllTicks();
  };

  it('samples and detects the same frame, releases every frame and throttles to 2 Hz', () => {
    const brightness = jest.fn();
    const { result, unmount } = renderHook(() =>
      useLighting(camera, true, { width: 100, height: 100 }, 'front', brightness, true),
    );
    const detector = jest.mocked(createFaceDetector).mock.results.at(-1)!.value;
    detector.detectFaces.mockReturnValue([
      { bounds: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 }, trackingId: 1 },
    ]);
    const first = frame();
    act(() => process(first));
    expect(first.dispose).toHaveBeenCalledTimes(1);
    expect(brightness).toHaveBeenLastCalledWith(120, 1000);
    const dropped = frame();
    act(() => process(dropped));
    expect(dropped.dispose).toHaveBeenCalledTimes(1);
    expect(detector.detectFaces).toHaveBeenCalledTimes(1);
    act(() => {
      jest.advanceTimersByTime(500);
      process(frame());
      jest.advanceTimersByTime(500);
      process(frame());
    });
    expect(result.current.result.state).toBe('good');
    expect(cues.say).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'lighting.good',
        category: 'lighting',
        silentUntilChange: true,
      }),
    );
    unmount();
  });
  it('disposes failing frames and ignores late callbacks after deactivation', () => {
    const brightness = jest.fn();
    const { result, rerender, unmount } = renderHook(
      ({ active }: { active: boolean }) =>
        useLighting(camera, active, { width: 100, height: 100 }, 'back', brightness, true),
      { initialProps: { active: true } },
    );
    const broken = {
      ...frame(),
      getPlanes: () => {
        throw new Error('Camera reconfigured');
      },
    } as unknown as Frame;
    act(() => process(broken));
    expect(broken.dispose).toHaveBeenCalledTimes(1);
    expect(result.current.result.state).toBe('unavailable');
    rerender({ active: false });
    act(() => {
      jest.advanceTimersByTime(500);
      process(frame());
    });
    expect(brightness).not.toHaveBeenCalled();
    unmount();
  });
});
