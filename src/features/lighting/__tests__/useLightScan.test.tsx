import { act, renderHook } from '@testing-library/react-native';
import { DeviceMotion } from 'expo-sensors';

import { cues, speakAndWait } from '@/cues';

import { useLightScan } from '../useLightScan';

jest.mock('@/cues', () => ({
  cues: { say: jest.fn(), clearCategory: jest.fn(), guideTone: jest.fn(() => true) },
  speakAndWait: jest.fn(async () => {}),
}));

describe('scan lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());
  it('subscribes only after an explicit scan, and removes the sensor when recording begins', async () => {
    const remove = jest.fn();
    jest.mocked(DeviceMotion.addListener).mockReturnValue({ remove });
    const { result, rerender, unmount } = renderHook(
      ({ idle }: { idle: boolean }) => useLightScan(true, idle),
      {
        initialProps: { idle: true },
      },
    );
    expect(DeviceMotion.addListener).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.result.phase).toBe('scanning');
    expect(DeviceMotion.addListener).toHaveBeenCalledTimes(1);
    rerender({ idle: false });
    act(() => jest.advanceTimersByTime(1));
    expect(remove).toHaveBeenCalledTimes(1);
    expect(result.current.result.phase).toBe('idle');
    unmount();
  });
  it('explains denied motion access and preserves ordinary lighting checks', async () => {
    jest
      .mocked(DeviceMotion.getPermissionsAsync)
      .mockResolvedValueOnce({ granted: false, canAskAgain: false } as Awaited<
        ReturnType<typeof DeviceMotion.getPermissionsAsync>
      >);
    const { result, unmount } = renderHook(() => useLightScan(true, true));
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.running).toBe(false);
    expect(DeviceMotion.addListener).not.toHaveBeenCalled();
    expect(cues.say).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lighting.scan.unavailable' }),
    );
    unmount();
  });
  it('does not start a scan if the app leaves while instructions are being spoken', async () => {
    let finish!: () => void;
    jest.mocked(speakAndWait).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const { result, rerender, unmount } = renderHook(
      ({ active }: { active: boolean }) => useLightScan(active, true),
      {
        initialProps: { active: true },
      },
    );
    let pending!: Promise<void>;
    await act(async () => {
      pending = result.current.start();
      await Promise.resolve();
    });
    rerender({ active: false });
    await act(async () => {
      finish();
      await pending;
    });
    expect(DeviceMotion.addListener).not.toHaveBeenCalled();
    expect(result.current.running).toBe(false);
    unmount();
  });
});
