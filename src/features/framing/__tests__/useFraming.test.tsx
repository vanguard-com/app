import { act, renderHook } from '@testing-library/react-native';
import type { CameraRef } from 'react-native-vision-camera';
import { createFaceDetectorOutput, type Face } from 'react-native-vision-camera-face-detector';

import { useFraming } from '../useFraming';

jest.mock('@/cues', () => ({
  cues: { say: jest.fn(), clearCategory: jest.fn(), guideTone: jest.fn(() => false) },
}));

describe('preview-to-phone guidance integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());

  it.each(['front', 'back'] as const)(
    'uses the visible offset directly with auto mirroring: %s',
    (facing) => {
      const camera = {
        current: {
          preview: {},
          convertCameraPointToViewPoint: (p: { x: number; y: number }) => p,
        } as unknown as CameraRef,
      };
      const { result, unmount } = renderHook(() =>
        useFraming(camera, facing, true, { width: 1000, height: 1000 }),
      );
      const options = jest.mocked(createFaceDetectorOutput).mock.calls.at(-1)![0];
      expect(options.mirrorMode).toBe('auto');
      const face = {
        bounds: { x: 750, y: 300, width: 300, height: 400 },
        trackingId: 1,
      } as unknown as Face;
      act(() => options.onFacesDetected([face]));
      act(() => jest.advanceTimersByTime(300));
      act(() => options.onFacesDetected([face]));
      expect(result.current.result.state).toBe('right');
      expect(result.current.statusText).toBe('Move phone right.');
      unmount();
    },
  );
});
