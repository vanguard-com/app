import { useEffect, useState } from 'react';

import { useSession } from '@/store/sessionStore';
import { useSettings } from '@/store/settingsStore';
import { useScreenReaderEnabled } from '@/utils/accessibility';

import { watchEarphones } from './audioRoute';
import { cues } from './index';

/** Keeps the cue engine in step with settings, recording state, screen reader and earphones. */
export function useCueEngineSync(): void {
  const verbosity = useSettings((s) => s.verbosity);
  const cueType = useSettings((s) => s.cueType);
  const voiceRate = useSettings((s) => s.voiceRate);
  const cueVolume = useSettings((s) => s.cueVolume);
  const recordingCues = useSettings((s) => s.recordingCues);
  const isRecording = useSession((s) => s.isRecording);
  const screenReaderOn = useScreenReaderEnabled();
  const [earphonesConnected, setEarphonesConnected] = useState(false);

  useEffect(() => watchEarphones(setEarphonesConnected), []);

  useEffect(() => {
    cues.configure({
      verbosity,
      cueType,
      voiceRate,
      cueVolume,
      recordingCues,
      isRecording,
      screenReaderOn,
      earphonesConnected,
    });
  }, [
    verbosity,
    cueType,
    voiceRate,
    cueVolume,
    recordingCues,
    isRecording,
    screenReaderOn,
    earphonesConnected,
  ]);
}
