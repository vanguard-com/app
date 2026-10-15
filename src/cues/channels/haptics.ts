import * as Haptics from 'expo-haptics';

import type { HapticPattern } from '@/theme';

// Gap between the two buzzes of a "double" pattern, long enough to feel as two.
const DOUBLE_GAP_MS = 180;

function buzz(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}

export function playHaptic(pattern: HapticPattern): void {
  if (pattern === 'none') return;
  buzz();
  if (pattern === 'double') setTimeout(buzz, DOUBLE_GAP_MS);
}
