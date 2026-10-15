/** Split milliseconds into whole minutes and seconds. */
export function splitDuration(ms: number): { minutes: number; seconds: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return { minutes: Math.floor(total / 60), seconds: total % 60 };
}

/** "m:ss" clock text, e.g. 72_000 -> "1:12". */
export function formatClock(ms: number): string {
  const { minutes, seconds } = splitDuration(ms);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
