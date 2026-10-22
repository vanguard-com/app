import { act, renderHook } from '@testing-library/react-native';
import { useFrameOutput, type CameraRef, type Frame } from 'react-native-vision-camera';
import { createFaceDetector } from 'react-native-vision-camera-face-detector';

import { cues } from '@/cues';
import { useSettings } from '@/store/settingsStore';

import { loadPoseResources } from '../poseResources';
import { useFeedbackCamera } from '../useFeedbackCamera';

jest.mock('../poseResources', () => ({ loadPoseResources: jest.fn() }));

jest.mock('@/cues', () => ({ cues: { say: jest.fn(() => true), clearCategory: jest.fn() } }));
const camera = {
  current: {
    preview: {},
    convertCameraPointToViewPoint: (p: { x: number; y: number }) => ({
      x: p.x * 100,
      y: p.y * 100,
    }),
  } as unknown as CameraRef,
};

describe('feedback camera integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1000);
    jest.clearAllMocks();
    useSettings.getState().reset();
    useSettings.getState().update({ liveFeedback: true });
    useSettings.getState().setFeedback('posture', false);
  });
  afterEach(() => jest.useRealTimers());
  function process(extra: Partial<Frame> = {}) {
    const frame = { dispose: jest.fn(), ...extra } as unknown as Frame;
    jest.mocked(useFrameOutput).mock.calls.at(-1)![0]!.onFrame!(frame);
    jest.runAllTicks();
    return frame;
  }
  it('requests native eye landmarks/classification, waits for persistent head turning and respects the master toggle', () => {
    const { result, unmount } = renderHook(() =>
      useFeedbackCamera(camera, true, 'front', { width: 100, height: 100 }),
    );
    expect(jest.mocked(createFaceDetector).mock.calls.at(-1)![0]).toMatchObject({
      runLandmarks: true,
      runClassifications: true,
    });
    const detector = jest.mocked(createFaceDetector).mock.results.at(-1)!.value;
    detector.detectFaces.mockReturnValue([
      {
        bounds: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 },
        trackingId: 1,
        yawAngle: 30,
        pitchAngle: 0,
        rollAngle: 0,
        smilingProbability: 0.8,
        landmarks: { LEFT_EYE: { x: 0.3, y: 0.4 }, RIGHT_EYE: { x: 0.6, y: 0.4 } },
      },
    ]);
    act(() => {
      process();
    });
    expect(result.current.observation.eyeContact).toBe(false);
    expect(cues.say).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'feedback.lookAtCamera' }),
    );
    act(() => {
      for (let i = 0; i < 15; i++) {
        jest.advanceTimersByTime(200);
        process();
      }
    });
    expect(cues.say).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'feedback.lookAtCamera', category: 'feedback' }),
    );
    const calls = detector.detectFaces.mock.calls.length;
    act(() => useSettings.getState().update({ liveFeedback: false }));
    act(() => {
      jest.advanceTimersByTime(200);
      expect(process().dispose).toHaveBeenCalledTimes(1);
    });
    expect(detector.detectFaces).toHaveBeenCalledTimes(calls);
    unmount();
  });
  it('runs same-frame pose inference and gives sustained head and posture issues independent turns', async () => {
    useSettings.getState().setFeedback('posture', true);
    const points = new Float32Array(51);
    for (let i = 0; i < 17; i++) points.set([0.5, 0.5, 1], i * 3);
    points.set([0.29, 0.5, 1], 0);
    points.set([0.2, 0.4, 1], 9);
    points.set([0.2, 0.6, 1], 12);
    points.set([0.3, 0.3, 1], 15);
    points.set([0.3, 0.7, 1], 18);
    points.set([0.8, 0.4, 1], 33);
    points.set([0.8, 0.6, 1], 36);
    const resized = {
      getPixelBuffer: () => new Uint8Array(192 * 192 * 3).buffer,
      dispose: jest.fn(),
    };
    const resources = {
      model: { runSync: jest.fn(() => [points.buffer]), dispose: jest.fn() },
      resizer: { resize: jest.fn(() => resized), dispose: jest.fn() },
    };
    jest
      .mocked(loadPoseResources)
      .mockResolvedValueOnce(resources as unknown as Awaited<ReturnType<typeof loadPoseResources>>);
    const { result, unmount } = renderHook(() =>
      useFeedbackCamera(camera, true, 'front', { width: 100, height: 100 }),
    );
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    const detector = jest.mocked(createFaceDetector).mock.results.at(-1)!.value;
    detector.detectFaces.mockReturnValue([
      {
        bounds: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 },
        trackingId: 1,
        yawAngle: 30,
        pitchAngle: 0,
        rollAngle: 0,
        smilingProbability: 0.8,
        landmarks: { LEFT_EYE: {}, RIGHT_EYE: {} },
      },
    ]);
    const metadata = {
      width: 192,
      height: 192,
      orientation: 'up' as const,
      isMirrored: false,
      convertFramePointToCameraPoint: (p: { x: number; y: number }) => ({
        x: p.x / 192,
        y: p.y / 192,
      }),
    };
    act(() => {
      for (let i = 0; i < 18; i++) {
        process(metadata);
        jest.advanceTimersByTime(200);
      }
    });
    expect(result.current.observation.posture).toBe('slouching');
    expect(cues.say).toHaveBeenCalledWith(expect.objectContaining({ id: 'feedback.lookAtCamera' }));
    expect(cues.say).toHaveBeenCalledWith(expect.objectContaining({ id: 'feedback.sitUp' }));
    expect(resized.dispose).toHaveBeenCalledTimes(18);
    unmount();
  });
  it('ignores disabled eye and expression measurements', () => {
    useSettings.getState().setFeedback('eyeContact', false);
    useSettings.getState().setFeedback('expression', false);
    const { result, unmount } = renderHook(() =>
      useFeedbackCamera(camera, true, 'back', { width: 100, height: 100 }),
    );
    act(() => process());
    expect(result.current.observation).toEqual({
      eyeContact: null,
      smiling: null,
      posture: 'unknown',
    });
    unmount();
  });
});
