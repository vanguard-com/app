import { Platform } from 'react-native';
import { AudioManager } from 'react-native-audio-api';

import { hasEarphones } from './policy';

// Android does not report route changes to this library, so also check every few seconds.
const POLL_MS = 4000;

/** Calls `onChange` with true / false whenever earphones are connected or removed. */
export function watchEarphones(onChange: (connected: boolean) => void): () => void {
  let last: boolean | null = null;
  let stopped = false;
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  const check = async () => {
    try {
      const info = await AudioManager.getDevicesInfo();
      const connected = hasEarphones(info, platform);
      if (!stopped && connected !== last) {
        last = connected;
        onChange(connected);
      }
    } catch {
      // Keep the last known value.
    }
  };

  check();
  const subscription = AudioManager.addSystemEventListener('routeChange', () => {
    check();
  });
  const timer = setInterval(check, POLL_MS);
  return () => {
    stopped = true;
    subscription?.remove();
    clearInterval(timer);
  };
}
