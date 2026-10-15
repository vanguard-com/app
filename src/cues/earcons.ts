// Earcon note sequences and tone maths. Pure logic, played by channels/audio.ts.

import type { Earcon } from './types';

export interface Note {
  /** Hz */
  frequency: number;
  /** Seconds from the earcon start. */
  start: number;
  /** Seconds. */
  duration: number;
}

const n = (frequency: number, start: number, duration: number): Note => ({
  frequency,
  start,
  duration,
});

// Short, gentle sine sequences. Rising = good / started, falling = stopped, low = error.
export const EARCONS: Record<Earcon, Note[]> = {
  chime: [n(880, 0, 0.12), n(1318.5, 0.11, 0.2)],
  start: [n(659.3, 0, 0.09), n(880, 0.09, 0.09), n(1174.7, 0.18, 0.16)],
  stop: [n(1174.7, 0, 0.09), n(880, 0.09, 0.09), n(659.3, 0.18, 0.16)],
  saved: [n(784, 0, 0.14), n(1046.5, 0.14, 0.26)],
  error: [n(329.6, 0, 0.16), n(246.9, 0.16, 0.26)],
  thinking: [n(523.3, 0, 0.1), n(523.3, 0.3, 0.1), n(523.3, 0.6, 0.1)],
  listening: [n(987.8, 0, 0.08)],
};

/** Total length of an earcon in milliseconds. */
export function earconDurationMs(earcon: Earcon): number {
  const notes = EARCONS[earcon];
  const end = Math.max(...notes.map((note) => note.start + note.duration));
  return Math.round(end * 1000);
}
