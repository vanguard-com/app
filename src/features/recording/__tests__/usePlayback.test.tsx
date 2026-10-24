import { act, renderHook } from '@testing-library/react-native';
import { useVideoPlayer } from 'expo-video';
import { isSpeechClaimed } from '@/features/voice/speechLease';
import { usePlayback } from '../usePlayback';

jest.mock('@/cues', () => ({ cues: { clear: jest.fn(), say: jest.fn() } }));
const emit = (name: string, payload?: unknown) => {
  const player = jest.mocked(useVideoPlayer).mock.results.at(-1)!.value;
  act(() => player.emit(name, payload));
};

it('leases commands before playing, restarts at zero and releases on pause/end', () => {
  const { result, unmount } = renderHook(() => usePlayback('file:///clip.mp4', true));
  act(() => result.current.play());
  expect(result.current.playing).toBe(true);
  expect(isSpeechClaimed()).toBe(true);
  emit('timeUpdate', { currentTime: 5 });
  expect(result.current.position).toBe(5);
  act(() => result.current.play(true));
  expect(result.current.player.currentTime).toBe(0);
  act(() => result.current.pause());
  expect(isSpeechClaimed()).toBe(false);
  act(() => result.current.play());
  emit('playToEnd');
  expect(result.current.playing).toBe(false);
  expect(isSpeechClaimed()).toBe(false);
  unmount();
});

it('pauses on background/focus loss and never automatically resumes', () => {
  const { result, rerender, unmount } = renderHook(
    ({ active }: { active: boolean }) => usePlayback('file:///clip.mp4', active),
    { initialProps: { active: true } },
  );
  act(() => result.current.play());
  rerender({ active: false });
  expect(isSpeechClaimed()).toBe(false);
  expect(result.current.playing).toBe(false);
  rerender({ active: true });
  expect(result.current.playing).toBe(false);
  act(() => result.current.play());
  unmount();
  expect(isSpeechClaimed()).toBe(false);
});

it('releases commands on native decode errors', () => {
  const { result, unmount } = renderHook(() => usePlayback('file:///clip.mp4', true));
  act(() => result.current.play());
  emit('statusChange', { status: 'error' });
  expect(result.current.failed).toBe(true);
  expect(result.current.playing).toBe(false);
  expect(isSpeechClaimed()).toBe(false);
  act(() => result.current.play());
  expect(isSpeechClaimed()).toBe(false);
  unmount();
});

it('keeps recorded speech isolated through buffering and automatic native resumption', () => {
  const { result, unmount } = renderHook(() => usePlayback('file:///clip.mp4', true));
  act(() => result.current.play());
  emit('playingChange', { isPlaying: false });
  expect(result.current.playing).toBe(true);
  expect(isSpeechClaimed()).toBe(true);
  emit('playingChange', { isPlaying: true });
  expect(isSpeechClaimed()).toBe(true);
  act(() => result.current.pause());
  expect(isSpeechClaimed()).toBe(false);
  // A late native resume event cannot restart media after an explicit pause.
  emit('playingChange', { isPlaying: true });
  expect(result.current.playing).toBe(false);
  expect(isSpeechClaimed()).toBe(false);
  unmount();
});
