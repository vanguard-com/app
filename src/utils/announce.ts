import { AccessibilityInfo, Platform } from 'react-native';

/** Speak a message through VoiceOver / TalkBack (no-op when no screen reader is running). */
export function announce(message: string): void {
  if (Platform.OS === 'ios') {
    // queue: true lets VoiceOver finish the current utterance instead of cutting it off.
    AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
  } else {
    AccessibilityInfo.announceForAccessibility(message);
  }
}
