import { FEEDBACK } from './config';

export interface VoiceFrame {
  db: number;
  pitchHz: number | null;
}

/** RMS level and normalized autocorrelation pitch on a short mono PCM window. */
export function analyseVoice(samples: Float32Array, sampleRate: number): VoiceFrame {
  if (
    !Number.isFinite(sampleRate) ||
    sampleRate < 2000 ||
    samples.length < 64 ||
    samples.some((v) => !Number.isFinite(v))
  )
    return { db: -120, pitchHz: null };
  let mean = 0;
  for (const v of samples) mean += v;
  mean /= samples.length;
  const signal = Float32Array.from(samples, (v) => v - mean);
  let energy = 0;
  for (const v of signal) energy += v * v;
  const db = Math.max(-120, 20 * Math.log10(Math.max(1e-6, Math.sqrt(energy / signal.length))));
  if (db < FEEDBACK.voicedDb) return { db, pitchHz: null };
  const minLag = Math.floor(sampleRate / FEEDBACK.maxPitchHz);
  const maxLag = Math.min(
    Math.ceil(sampleRate / FEEDBACK.minPitchHz),
    Math.floor(signal.length / 2),
  );
  const scores: number[] = [];
  for (let lag = minLag; lag <= maxLag; lag++) {
    let cross = 0,
      a = 0,
      b = 0;
    for (let i = 0; i < signal.length - maxLag; i++) {
      cross += signal[i] * signal[i + lag];
      a += signal[i] ** 2;
      b += signal[i + lag] ** 2;
    }
    scores[lag] = a * b > 0 ? cross / Math.sqrt(a * b) : 0;
  }
  // First strong local peak avoids choosing a lower-octave multiple of the true period.
  let best = minLag;
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (scores[lag] > scores[best]) best = lag;
    if (
      scores[lag] >= FEEDBACK.pitchConfidence &&
      scores[lag] >= scores[lag - 1] &&
      scores[lag] >= scores[lag + 1]
    )
      return { db, pitchHz: sampleRate / lag };
  }
  return { db, pitchHz: scores[best] >= FEEDBACK.pitchConfidence ? sampleRate / best : null };
}

export function pitchVariation(pitches: readonly number[]): number | null {
  const valid = pitches.filter(
    (v) => Number.isFinite(v) && v >= FEEDBACK.minPitchHz && v <= FEEDBACK.maxPitchHz,
  );
  if (valid.length < 20) return null;
  const semitones = valid.map((v) => 12 * Math.log2(v / 440));
  const mean = semitones.reduce((a, b) => a + b, 0) / semitones.length;
  return Math.sqrt(semitones.reduce((sum, v) => sum + (v - mean) ** 2, 0) / semitones.length);
}

/** Recognizer interim revisions replace previous text; never add partial transcripts together. */
export function wordsPerMinute(transcript: string, durationMs: number): number | null {
  if (durationMs < FEEDBACK.minPaceWindowMs || !Number.isFinite(durationMs)) return null;
  const words = transcript.trim().match(/\b[a-z]+(?:['’][a-z]+)?\b/gi)?.length ?? 0;
  return words ? (words * 60_000) / durationMs : null;
}
