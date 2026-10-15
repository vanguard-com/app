/** Pure framing logic. All boxes use normalized, visible-preview coordinates, without clamping. */
export interface Box { x: number; y: number; width: number; height: number }
export interface Target { box: Box; id?: number }
export type FramingState = 'searching' | 'unavailable' | 'good' | 'left' | 'right' | 'up' | 'down' | 'back' | 'closer';
export interface Framing {
  state: FramingState;
  status: 'good' | 'adjust' | 'problem';
  edges: ('left' | 'right' | 'top' | 'bottom')[];
  pan: number;
  frequency: number;
  intervalMs: number;
  box: Box | null;
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const LOST_MS = 1000;
export const SETTLE_MS = 250;
export const ANALYSIS_INTERVAL_MS = 1000 / 12;

export function validBox(b: Box): boolean {
  return [b.x, b.y, b.width, b.height].every(Number.isFinite) && b.width > 0 && b.height > 0;
}

/** Transform all four corners; native converter handles rotation, mirroring and cover crop. */
export function previewBox(
  box: Box,
  size: { width: number; height: number },
  convert: (p: { x: number; y: number }) => { x: number; y: number },
): Box | null {
  if (!validBox(box) || size.width <= 0 || size.height <= 0) return null;
  const points = [
    { x: box.x, y: box.y }, { x: box.x + box.width, y: box.y },
    { x: box.x, y: box.y + box.height }, { x: box.x + box.width, y: box.y + box.height },
  ].map(convert);
  const xs = points.map(p => p.x / size.width);
  const ys = points.map(p => p.y / size.height);
  const result = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  return validBox(result) ? result : null;
}

export function analyseBox(box: Box | null, mirrored: boolean, safeZone = 0.8, wasGood = false): Framing {
  const empty: Framing = { state: 'searching', status: 'adjust', edges: [], pan: 0, frequency: 440, intervalMs: 900, box: null };
  if (!box || !validBox(box)) return empty;
  const { x, y, width: w, height: h } = box;
  const dx = (x + w / 2 - 0.5) * (mirrored ? -1 : 1);
  const dy = y + h / 2 - 0.5;
  const edges: Framing['edges'] = [];
  if (x <= 0.015) edges.push('left');
  if (x + w >= 0.985) edges.push('right');
  if (y <= 0.015) edges.push('top');
  if (y + h >= 0.985) edges.push('bottom');
  const margin = (1 - clamp(Number.isFinite(safeZone) ? safeZone : 0.8, 0.5, 0.95)) / 2;
  const tolerance = wasGood ? 0.02 : 0;
  const inside = x >= margin - tolerance && y >= margin - tolerance && x + w <= 1 - margin + tolerance && y + h <= 1 - margin + tolerance;
  let state: FramingState;
  if (Math.max(w, h) > 0.9 || w > 1 - 2 * margin || h > 1 - 2 * margin) state = 'back';
  else if (Math.max(w, h) < 0.16 && Math.abs(dx) < 0.15 && Math.abs(dy) < 0.15) state = 'closer';
  else if (inside) state = 'good';
  else {
    // Pick the axis that protrudes furthest outside the safe zone, including off-centre large faces.
    const horizontal = Math.max(margin - x, x + w - (1 - margin), 0);
    const vertical = Math.max(margin - y, y + h - (1 - margin), 0);
    state = horizontal > vertical ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
  }
  return {
    state, status: state === 'good' ? 'good' : edges.length ? 'problem' : 'adjust', edges, box,
    pan: clamp(dx * 2, -1, 1),
    frequency: 440 * Math.pow(2, clamp(-dy * 2, -1, 1)),
    intervalMs: 180 + clamp(Math.hypot(dx, dy) / 0.7, 0, 1) * 720,
  };
}

/** Track an ID rather than jumping to a bystander. Without IDs, require spatial continuity. */
export function chooseTarget(targets: Target[], previous: Target | null): Target | null {
  const valid = targets.filter(t => validBox(t.box));
  if (!previous) return valid.sort((a, b) => b.box.width * b.box.height - a.box.width * a.box.height)[0] ?? null;
  if (previous.id !== undefined) return valid.find(t => t.id === previous.id) ?? null;
  const distance = (t: Target) => Math.hypot(t.box.x + t.box.width / 2 - previous.box.x - previous.box.width / 2, t.box.y + t.box.height / 2 - previous.box.y - previous.box.height / 2);
  return valid.filter(t => distance(t) < 0.25).sort((a, b) => distance(a) - distance(b))[0] ?? null;
}

export function smoothBox(previous: Box | null, next: Box): Box {
  if (!previous) return next;
  const a = 0.4;
  return { x: previous.x + a * (next.x - previous.x), y: previous.y + a * (next.y - previous.y), width: previous.width + a * (next.width - previous.width), height: previous.height + a * (next.height - previous.height) };
}

/** Sustained states only; subject loss never reuses an old good result indefinitely. */
export class FramingTracker {
  private target: Target | null = null;
  private smoothed: Box | null = null;
  private lastSeen: number;
  private pending: FramingState = 'searching';
  private pendingSince: number;
  result = analyseBox(null, false);
  constructor(now: number) { this.lastSeen = now; this.pendingSince = now; }
  update(targets: Target[], now: number, mirrored: boolean, safeZone: number): Framing {
    const selected = chooseTarget(targets, this.target);
    if (!selected) return this.tick(now);
    this.lastSeen = now;
    this.target = selected;
    this.smoothed = smoothBox(this.smoothed, selected.box);
    const raw = analyseBox(selected.box, mirrored, safeZone);
    // Never smooth away a visible edge crossing.
    const next = raw.edges.length ? raw : analyseBox(this.smoothed, mirrored, safeZone, this.result.state === 'good');
    if (this.pending !== next.state) { this.pending = next.state; this.pendingSince = now; }
    if (now - this.pendingSince >= SETTLE_MS) this.result = next;
    else if (this.result.state !== next.state) this.result = { ...next, state: 'searching', status: 'adjust', box: null };
    return this.result;
  }
  tick(now: number): Framing {
    if (now - this.lastSeen >= LOST_MS) {
      this.target = null; this.smoothed = null;
      this.pending = 'searching'; this.pendingSince = now;
      this.result = analyseBox(null, false);
    }
    return this.result;
  }
}

export interface ZoomLimits { min: number; max: number }
/** Small steps, sustained size error and a cooldown; never change zoom during recording. */
export class AutoZoom {
  private direction: 'in' | 'out' | null = null;
  private since = 0;
  private lastChange = -Infinity;
  update(result: Framing, now: number, zoom: number, limits: ZoomLimits, enabled: boolean, idle: boolean): number | null {
    const direction = result.state === 'back' ? 'out' : result.state === 'closer' ? 'in' : null;
    if (!enabled || !idle || !direction || !Number.isFinite(zoom) || limits.min <= 0 || limits.max < limits.min) {
      this.direction = null; return null;
    }
    if (direction !== this.direction) { this.direction = direction; this.since = now; return null; }
    if (now - this.since < 1200 || now - this.lastChange < 3000) return null;
    const next = clamp(zoom * (direction === 'out' ? 0.85 : 1.1), limits.min, Math.min(limits.max, limits.min * 3));
    if (Math.abs(next - zoom) < 0.01) return null;
    this.lastChange = now;
    return next;
  }
}
