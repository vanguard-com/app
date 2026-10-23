import type { Box } from '@/features/framing/model';
import { COCO_LABELS } from './labels';

export interface Detection {
  label: string;
  box: Box;
  score: number;
}
export interface TrackedObject extends Detection {
  id: number;
  seen: number;
  first: number;
  last: number;
  originX: number;
}
export type BackgroundWarning = 'bright' | 'person' | 'clutter';
export const STALE_MS = 2500;

export function parseDetections(outputs: readonly ArrayBuffer[]): Detection[] {
  'worklet';
  if (outputs.length !== 4) return [];
  const boxes = new Float32Array(outputs[0]),
    classes = new Float32Array(outputs[1]),
    scores = new Float32Array(outputs[2]),
    count = new Float32Array(outputs[3])[0];
  if (
    boxes.length !== 40 ||
    classes.length !== 10 ||
    scores.length !== 10 ||
    !Number.isFinite(count)
  )
    return [];
  const result: Detection[] = [];
  for (let i = 0; i < Math.min(10, count); i++) {
    const label = COCO_LABELS[Math.round(classes[i])];
    const y = boxes[i * 4],
      x = boxes[i * 4 + 1],
      height = boxes[i * 4 + 2] - y,
      width = boxes[i * 4 + 3] - x;
    if (
      scores[i] >= 0.55 &&
      label &&
      label !== '???' &&
      [x, y, width, height, scores[i]].every(Number.isFinite) &&
      width > 0 &&
      height > 0
    )
      result.push({ label, score: scores[i], box: { x, y, width, height } });
  }
  return result;
}
export function overlap(a: Box, b: Box): number {
  const area =
    Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return area / (a.width * a.height + b.width * b.height - area || 1);
}
export function position(box: Box): 'left' | 'centre' | 'right' {
  const x = box.x + box.width / 2;
  return x < 0.35 ? 'left' : x > 0.65 ? 'right' : 'centre';
}
export function containsFace(box: Box, face: Box | null): boolean {
  if (!face) return false;
  const x = face.x + face.width / 2,
    y = face.y + face.height / 2;
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
}
export class ObjectTracker {
  private tracks: TrackedObject[] = [];
  private nextId = 1;
  update(detections: Detection[], at: number): TrackedObject[] {
    const remaining = this.tracks.filter((t) => at - t.last <= STALE_MS);
    const updated: TrackedObject[] = [];
    for (const d of detections) {
      let best = -1,
        score = 0.25;
      remaining.forEach((t, i) => {
        const s = t.label === d.label ? overlap(t.box, d.box) : 0;
        if (s > score) {
          score = s;
          best = i;
        }
      });
      const old = best >= 0 ? remaining.splice(best, 1)[0] : null;
      updated.push(
        old
          ? {
              ...d,
              id: old.id,
              seen: old.seen + 1,
              first: old.first,
              last: at,
              originX: old.originX,
              box: {
                x: old.box.x * 0.3 + d.box.x * 0.7,
                y: old.box.y * 0.3 + d.box.y * 0.7,
                width: d.box.width,
                height: d.box.height,
              },
            }
          : {
              ...d,
              id: this.nextId++,
              seen: 1,
              first: at,
              last: at,
              originX: d.box.x + d.box.width / 2,
            },
      );
    }
    this.tracks = [...updated, ...remaining];
    return this.current(at);
  }
  current(at: number): TrackedObject[] {
    return this.tracks.filter((t) => t.seen >= 2 && at - t.last <= STALE_MS);
  }
}
/** Heuristics describe observable distractions; neither COCO nor luminance identifies a window. */
export function backgroundWarnings(
  objects: TrackedObject[],
  face: Box | null,
  bright: boolean,
  now: number,
): BackgroundWarning[] {
  const fresh = objects.filter((o) => now - o.last <= 1200);
  const warnings: BackgroundWarning[] = [];
  if (bright && face) warnings.push('bright');
  if (
    fresh.some(
      (o) =>
        o.label === 'person' &&
        !containsFace(o.box, face) &&
        now - o.first < 6000 &&
        Math.abs(o.box.x + o.box.width / 2 - o.originX) > 0.04,
    )
  )
    warnings.push('person');
  if (face) {
    const near = {
      x: face.x - 0.12,
      y: face.y - 0.12,
      width: face.width + 0.24,
      height: face.height + 0.24,
    };
    if (fresh.filter((o) => o.label !== 'person' && overlap(o.box, near) > 0.015).length >= 3)
      warnings.push('clutter');
  }
  return warnings;
}
