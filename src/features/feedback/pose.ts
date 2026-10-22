import type { CameraOrientation } from 'react-native-vision-camera';

import type { Keypoint } from './model';

/** Inverse of the v5.2.3 resizer's contain -> rotation -> mirror shader mapping. */
export function posePointToFrame(
  point: { x: number; y: number },
  width: number,
  height: number,
  orientation: CameraOrientation,
  mirrored: boolean,
): { x: number; y: number } {
  'worklet';
  const sideways = orientation === 'left' || orientation === 'right';
  const uprightWidth = sideways ? height : width,
    uprightHeight = sideways ? width : height;
  const scale = Math.min(192 / uprightWidth, 192 / uprightHeight);
  let x = (point.x * 192 - (192 - uprightWidth * scale) / 2) / (uprightWidth * scale);
  let y = (point.y * 192 - (192 - uprightHeight * scale) / 2) / (uprightHeight * scale);
  if (orientation === 'right') [x, y] = [y, 1 - x];
  else if (orientation === 'down') [x, y] = [1 - x, 1 - y];
  else if (orientation === 'left') [x, y] = [1 - y, x];
  if (mirrored) x = 1 - x;
  return { x: x * width, y: y * height };
}

export function parsePose(output: Float32Array): Keypoint[] {
  'worklet';
  if (output.length !== 51) return [];
  const result: Keypoint[] = [];
  for (let i = 0; i < 17; i++)
    result.push({ y: output[i * 3], x: output[i * 3 + 1], score: output[i * 3 + 2] });
  return result;
}
