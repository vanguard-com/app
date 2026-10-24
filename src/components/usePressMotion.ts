import { useEffect, useState } from 'react';
import { Animated, Easing, Platform } from 'react-native';

import { useReducedMotion } from '@/utils/accessibility';

// Motion follows a few strict rules so it feels responsive, never decorative:
// - Strong ease-out curve: movement starts instantly and settles softly.
// - Short durations (under 200 ms) so a press never feels slower than the tap.
// - Small scale change (0.97), never from or to zero.
// - Nothing moves when the phone's Reduce Motion setting is on.
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const PRESS_SCALE = 0.97;
export const PRESS_IN_MS = 120;
export const PRESS_OUT_MS = 200;
const NATIVE_DRIVER = Platform.OS !== 'web';

/** Scale feedback for a pressable surface. Returns handlers plus an animated transform. */
export function usePressMotion(enabled = true) {
  const reducedMotion = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const animate = (toValue: number, duration: number) => {
    // Releasing always settles back to full size, even if the control was disabled mid-press.
    if (toValue < 1 && (reducedMotion || !enabled)) return;
    Animated.timing(scale, {
      toValue,
      duration,
      easing: EASE_OUT,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  };
  return {
    onPressIn: () => animate(PRESS_SCALE, PRESS_IN_MS),
    onPressOut: () => animate(1, PRESS_OUT_MS),
    transform: [{ scale }],
  };
}

/** Animates 0 to 1 when `on` flips, for switches. Jumps straight there with Reduce Motion. */
export function useToggleProgress(on: boolean) {
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(on ? 1 : 0));
  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(on ? 1 : 0);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: on ? 1 : 0,
      duration: 180,
      easing: EASE_OUT,
      useNativeDriver: NATIVE_DRIVER,
    });
    animation.start();
    return () => animation.stop();
  }, [on, reducedMotion, progress]);
  return progress;
}
