import type { Box } from '@/features/framing/model';

import { LIGHTING } from './config';

export type LightingState =
  | 'waiting'
  | 'unavailable'
  | 'needsFace'
  | 'dark'
  | 'backlit'
  | 'shadowLeft'
  | 'shadowRight'
  | 'shadowTop'
  | 'shadowBottom'
  | 'good';

export interface LightingResult {
  state: LightingState;
  overall: number;
  face: number | null;
  background: number | null;
}

export const EMPTY_LIGHTING: LightingResult = {
  state: 'waiting',
  overall: 0,
  face: null,
  background: null,
};

export function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Grid and face bounds are both in visible preview coordinates, including crop and mirroring. */
export function analyseLighting(
  grid: readonly number[],
  size: number,
  box: Box | null,
): LightingResult {
  if (
    !Number.isInteger(size) ||
    size < 2 ||
    grid.length !== size * size ||
    grid.some((v) => !Number.isFinite(v) || v < 0 || v > 255)
  ) {
    return { ...EMPTY_LIGHTING, state: 'unavailable' };
  }
  const overall = grid.reduce((a, b) => a + b, 0) / grid.length;
  const groups = {
    face: [] as number[],
    background: [] as number[],
    left: [] as number[],
    right: [] as number[],
    top: [] as number[],
    bottom: [] as number[],
  };
  const valid =
    box &&
    [box.x, box.y, box.width, box.height].every(Number.isFinite) &&
    box.width > 0 &&
    box.height > 0;
  grid.forEach((v, i) => {
    const x = ((i % size) + 0.5) / size;
    const y = (Math.floor(i / size) + 0.5) / size;
    if (
      valid &&
      box &&
      x >= box.x &&
      x <= box.x + box.width &&
      y >= box.y &&
      y <= box.y + box.height
    ) {
      groups.face.push(v);
      groups[x < box.x + box.width / 2 ? 'left' : 'right'].push(v);
      groups[y < box.y + box.height / 2 ? 'top' : 'bottom'].push(v);
    } else groups.background.push(v);
  });
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  if (
    groups.face.length < LIGHTING.minimumFaceCells ||
    [groups.left, groups.right, groups.top, groups.bottom].some((a) => a.length < 2)
  ) {
    return {
      state: overall < LIGHTING.dark ? 'dark' : 'needsFace',
      overall,
      face: null,
      background: overall,
    };
  }
  const face = mean(groups.face);
  const background = groups.background.length ? mean(groups.background) : null;
  const result = { overall, face, background };
  if (
    background !== null &&
    background - face >= LIGHTING.backlightDifference &&
    background >= face * LIGHTING.backlightRatio
  )
    return { ...result, state: 'backlit' };
  if (face < LIGHTING.dark) return { ...result, state: 'dark' };
  const left = mean(groups.left),
    right = mean(groups.right);
  const top = mean(groups.top),
    bottom = mean(groups.bottom);
  const horizontal = Math.abs(left - right),
    vertical = Math.abs(top - bottom);
  const shadow = (a: number, b: number) =>
    Math.abs(a - b) >= LIGHTING.shadowDifference &&
    Math.max(a, b) >= Math.min(a, b) * LIGHTING.shadowRatio;
  if (shadow(left, right) && (!shadow(top, bottom) || horizontal >= vertical)) {
    return { ...result, state: left < right ? 'shadowLeft' : 'shadowRight' };
  }
  if (shadow(top, bottom)) return { ...result, state: top < bottom ? 'shadowTop' : 'shadowBottom' };
  return { ...result, state: 'good' };
}

/** A whole second of agreement before changing cues, so exposure settling does not chatter. */
export class LightingTracker {
  private pending: LightingState = 'waiting';
  private since = 0;
  private lastSample: number;
  constructor(now = Date.now()) {
    this.lastSample = now;
  }
  result = EMPTY_LIGHTING;
  update(next: LightingResult, now: number): LightingResult {
    this.lastSample = now;
    if (next.state !== this.pending) {
      this.pending = next.state;
      this.since = now;
    }
    if (now - this.since >= LIGHTING.settleMs || next.state === 'unavailable') this.result = next;
    return this.result;
  }
  tick(now: number): LightingResult {
    if (now - this.lastSample > LIGHTING.staleMs)
      this.result = { ...EMPTY_LIGHTING, state: 'unavailable' };
    return this.result;
  }
}
