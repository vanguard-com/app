import { announce } from '@/utils/announce';

import { playEarcon, playTone } from './channels/audio';
import { playHaptic } from './channels/haptics';
import { expoSpeechAdapter } from './channels/speech';
import { CueEngine } from './engine';

export type { Cue, CueCategory, Earcon } from './types';
export { CueEngine } from './engine';

/** The app wide cue engine. Every feature speaks through this, never directly. */
export const cues = new CueEngine({
  speech: expoSpeechAdapter,
  announce,
  playEarcon,
  playHaptic,
  playTone,
});

/**
 * Speak a system message and resolve when it has finished (or after a safety timeout), e.g. to
 * explain a permission before the system dialog appears.
 */
export function speakAndWait(text: string, id = `wait.${text}`): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    cues.say({ id, category: 'system', text, onFinished: finish });
    setTimeout(finish, Math.max(4000, text.length * 120));
  });
}

