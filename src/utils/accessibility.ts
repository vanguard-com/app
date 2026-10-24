import { useCallback, useEffect, useState, type RefObject } from 'react';
import { AccessibilityInfo, type Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAppActive } from '@/hooks/useAppActive';

import { announce } from './announce';

export { announce };

// Screen transitions move screen reader focus; announcing too early gets swallowed.
const SCREEN_ANNOUNCE_DELAY_MS = 600;

/** Announce `message` every time the screen gains focus. */
export function useScreenAnnouncement(
  message: string,
  enabled = true,
  target?: RefObject<Text | null>,
): void {
  const active = useAppActive();
  const reader = useScreenReaderEnabled();
  useFocusEffect(
    useCallback(() => {
      if (!enabled || !active) return;
      const id = setTimeout(() => {
        if (reader && target?.current) {
          try {
            AccessibilityInfo.sendAccessibilityEvent(target.current, 'focus');
            return;
          } catch {
            /* An unmounted native heading falls back to an announcement. */
          }
        }
        announce(message);
      }, SCREEN_ANNOUNCE_DELAY_MS);
      return () => clearTimeout(id);
    }, [message, enabled, active, reader, target]),
  );
}

/** True while VoiceOver (iOS) or TalkBack (Android) is on. Updates live. */
export function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((value) => {
        if (mounted) setEnabled(value);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return enabled;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      listener.remove();
    };
  }, []);
  return reduced;
}
