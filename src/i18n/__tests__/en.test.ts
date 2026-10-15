import { en } from '@/i18n/en';

describe('spoken duration', () => {
  it.each([
    [0, '0 seconds'],
    [1, '1 second'],
    [45, '45 seconds'],
    [60, '1 minute'],
    [72, '1 minute 12 seconds'],
    [121, '2 minutes 1 second'],
    [180, '3 minutes'],
    [29.6, '30 seconds'],
  ])('%s s -> "%s"', (seconds, text) => {
    expect(en.common.duration(seconds)).toBe(text);
  });
});
