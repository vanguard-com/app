import { cues, speakAndWait } from '@/cues';
import type { Cue } from '../types';

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});
it('cancels queued speech and removes the safety timeout when a permission step is left', async () => {
  const say = jest.spyOn(cues, 'say').mockReturnValue(true);
  const clear = jest.spyOn(cues, 'clearIds').mockImplementation(() => {});
  const controller = new AbortController();
  const pending = speakAndWait('Explanation', 'permission.test', controller.signal);
  expect(say).toHaveBeenCalledTimes(1);
  controller.abort();
  await pending;
  expect(clear).toHaveBeenCalledWith(['permission.test']);
  expect(jest.getTimerCount()).toBe(0);
});
it('cleans up its timeout after ordinary speech completion', async () => {
  let cue!: Cue;
  jest.spyOn(cues, 'say').mockImplementation((value) => {
    cue = value;
    return true;
  });
  const pending = speakAndWait('Explanation', 'permission.test');
  cue.onFinished?.();
  await pending;
  expect(jest.getTimerCount()).toBe(0);
});
