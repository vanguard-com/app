import * as Speech from 'expo-speech';

import type { SpeechAdapter } from '../engine';

// English only in v1.
const LANGUAGE = 'en';

export const expoSpeechAdapter: SpeechAdapter = {
  speak(text, { rate, volume, onDone }) {
    Speech.speak(text, {
      language: LANGUAGE,
      rate,
      volume,
      // Share Lumi's audio session so speech follows earphones / loudspeaker routing.
      useApplicationAudioSession: true,
      onDone,
      onStopped: onDone,
      onError: () => onDone(),
    });
  },
  stop() {
    Speech.stop().catch(() => {});
  },
};
