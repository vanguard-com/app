export interface Point {
  x: number;
  y: number;
}

/** Sample the visible preview, not the uncropped sensor. Native converters provide this affine map. */
export function sampleLuma(
  bytes: Uint8Array,
  width: number,
  height: number,
  stride: number,
  origin: Point,
  right: Point,
  bottom: Point,
  size: number,
  videoRange: boolean,
): number[] {
  'worklet';
  if (width <= 0 || height <= 0 || stride < width || bytes.length < (height - 1) * stride + width)
    return [];
  const grid: number[] = [];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size,
        v = (y + 0.5) / size;
      const px = Math.floor(origin.x + u * (right.x - origin.x) + v * (bottom.x - origin.x));
      const py = Math.floor(origin.y + u * (right.y - origin.y) + v * (bottom.y - origin.y));
      if (
        !Number.isFinite(px) ||
        !Number.isFinite(py) ||
        px < 0 ||
        py < 0 ||
        px >= width ||
        py >= height
      )
        return [];
      const value = bytes[py * stride + px];
      grid.push(videoRange ? Math.max(0, Math.min(255, ((value - 16) * 255) / 219)) : value);
    }
  return grid;
}
