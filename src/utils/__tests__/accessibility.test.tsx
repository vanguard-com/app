/* eslint-disable @typescript-eslint/no-require-imports -- Native navigation hooks are mocked lazily. */
import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo, type Text } from 'react-native';
import { useNarration } from '@/features/onboarding/useNarration';
import { cues } from '@/cues';
import { useReducedMotion, useScreenAnnouncement } from '../accessibility';

let mockFocused = true,
  mockActive = true;
jest.mock('expo-router', () => ({
  useIsFocused: () => mockFocused,
  useFocusEffect: function useFocusEffect(callback: () => void | (() => void)) {
    const { useEffect } = require('react');
    // The mutable test focus is re-read on explicit rerenders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => (mockFocused ? callback() : undefined), [callback, mockFocused]);
  },
}));
jest.mock('@/hooks/useAppActive', () => ({ useAppActive: () => mockActive }));
jest.mock('@/cues', () => ({ cues: { say: jest.fn(() => true), clearIds: jest.fn() } }));
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockFocused = true;
  mockActive = true;
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('focuses the heading once and cancels stale navigation announcements', async () => {
  jest.mocked(AccessibilityInfo.isScreenReaderEnabled).mockResolvedValue(true);
  const target = { current: {} as Text };
  const { rerender, unmount } = renderHook(
    ({ title }: { title: string }) => useScreenAnnouncement(title, true, target),
    { initialProps: { title: 'First' } },
  );
  await act(async () => {});
  act(() => jest.advanceTimersByTime(300));
  mockFocused = false;
  rerender({ title: 'First' });
  act(() => jest.advanceTimersByTime(1000));
  expect(AccessibilityInfo.sendAccessibilityEvent).not.toHaveBeenCalled();
  mockFocused = true;
  rerender({ title: 'Second' });
  act(() => jest.advanceTimersByTime(600));
  expect(AccessibilityInfo.sendAccessibilityEvent).toHaveBeenCalledTimes(1);
  expect(AccessibilityInfo.sendAccessibilityEvent).toHaveBeenCalledWith(target.current, 'focus');
  unmount();
});

it('cancels old tutorial speech and does not narrate while the app is inactive', () => {
  const { rerender, unmount } = renderHook(
    ({ id }: { id: string }) => useNarration(id, 'Instructions'),
    { initialProps: { id: 'lesson.one' } },
  );
  act(() => jest.advanceTimersByTime(300));
  rerender({ id: 'lesson.two' });
  act(() => jest.advanceTimersByTime(700));
  expect(cues.say).toHaveBeenCalledTimes(1);
  expect(cues.say).toHaveBeenCalledWith(expect.objectContaining({ id: 'lesson.two' }));
  expect(cues.clearIds).toHaveBeenCalledWith(['lesson.one']);
  mockActive = false;
  rerender({ id: 'lesson.two' });
  act(() => jest.advanceTimersByTime(2000));
  expect(cues.say).toHaveBeenCalledTimes(1);
  unmount();
});

it('responds to the OS reduced-motion setting and removes its listener', async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValueOnce(false);
  const remove = jest.fn();
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockReturnValue({ remove } as unknown as ReturnType<
      typeof AccessibilityInfo.addEventListener
    >);
  const { result, unmount } = renderHook(() => useReducedMotion());
  await act(async () => {});
  expect(result.current).toBe(false);
  const calls = jest.mocked(AccessibilityInfo.addEventListener).mock.calls as unknown as [
    string,
    (value: boolean) => void,
  ][];
  const listener = calls.findLast(([name]) => name === 'reduceMotionChanged')![1];
  act(() => listener(true));
  expect(result.current).toBe(true);
  unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});

it('does not repeat the automatic lesson after the user asks to hear it immediately', () => {
  const { result, unmount } = renderHook(() => useNarration('lesson.one', 'Instructions'));
  act(() => result.current.replay());
  act(() => jest.advanceTimersByTime(1000));
  expect(cues.say).toHaveBeenCalledTimes(1);
  unmount();
});
