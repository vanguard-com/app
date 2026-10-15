import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { announce } from './announce';

export { announce };

// Screen transitions move screen reader focus; announcing too early gets swallowed.
const SCREEN_ANNOUNCE_DELAY_MS = 600;

/** Announce `message` every time the screen gains focus. */
export function useScreenAnnouncement(message: string): void {
  useFocusEffect(
    useCallback(() => {
      const id = setTimeout(() => announce(message), SCREEN_ANNOUNCE_DELAY_MS);
      return () => clearTimeout(id);
    }, [message]),
  );
}

/** True while VoiceOver (iOS) or TalkBack (Android) is on. Updates live. */
export function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (mounted) setEnabled(value);
    });
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return enabled;
}
