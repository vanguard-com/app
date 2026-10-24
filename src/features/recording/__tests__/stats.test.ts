import { fullyInFrame, RecordingStats } from '../stats';
import { recordingSummary } from '../summary';
import type { LightingResult } from '@/features/lighting/model';

const box = { x: 0.2, y: 0.1, width: 0.4, height: 0.5 };
const light = (state: LightingResult['state'], face: number | null = 100): LightingResult => ({
  state,
  face,
  background: 100,
  overall: 100,
});

it('measures elapsed time, counts lost/cropped subjects, and reports the dark tail', () => {
  const stats = new RecordingStats();
  stats.sampleFraming(box, 0);
  stats.sampleFraming(box, 500);
  stats.sampleFraming(null, 1000);
  stats.sampleFraming({ ...box, y: -0.1 }, 1500);
  stats.sampleLighting(light('good'), 0);
  stats.sampleLighting(light('good'), 1000);
  stats.sampleLighting(light('dark'), 2000);
  stats.sampleLighting(light('dark'), 3000);
  const value = stats.finish(3500);
  expect(value).toEqual({
    framingMeasuredMs: 1500,
    inFramePercent: 67,
    lightingMeasuredMs: 3500,
    goodLightingPercent: 57,
    darkTailMs: 1500,
  });
  expect(stats.finish(3500)).toEqual(value);
});

it('excludes detector stalls, disabled/missing metrics and unknown face lighting', () => {
  const stats = new RecordingStats();
  stats.sampleFraming(box, 0);
  stats.sampleFraming(box, 500);
  stats.sampleFraming(null, 4000);
  stats.sampleLighting(light('dark'), 0);
  stats.sampleLighting(light('needsFace', null), 500);
  stats.sampleLighting(light('good'), 5000);
  expect(stats.finish(10000)).toEqual({
    framingMeasuredMs: 500,
    inFramePercent: 100,
    lightingMeasuredMs: 500,
    goodLightingPercent: 0,
    darkTailMs: 0,
  });
  expect(new RecordingStats().finish(10000).inFramePercent).toBeNull();
});

it.each([
  null,
  { ...box, x: -0.01 },
  { ...box, width: 0 },
  { ...box, height: Infinity },
  { ...box, x: 0.9 },
])('rejects out of frame or invalid boxes %j', (value) => expect(fullyInFrame(value)).toBe(false));
it('accepts a fully visible face at the image edge', () =>
  expect(fullyInFrame({ x: 0, y: 0, width: 1, height: 1 })).toBe(true));

it('speaks coverage, missing measurements and the absence of recorded audio', () => {
  const text = recordingSummary(
    { uri: 'file:///video.mp4', durationMs: 72000, hasAudio: false, savedToPhotos: false },
    false,
  );
  expect(text).toContain('Video length 1 minute 12 seconds');
  expect(text).toContain('no recorded sound');
  expect(text).toContain('Framing was not measured');
  expect(text).not.toContain('100%');
});
