import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';

import { cues } from '@/cues';
import { strings } from '@/i18n';
import { useSettings } from '@/store/settingsStore';
import { useSession, type RecordingInfo } from '@/store/sessionStore';

import { analyseRecordedVoice } from './recordedVoice';

export function useRecordedVoice(
  recording: RecordingInfo | null,
  active: boolean,
  enabled: boolean,
) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const live = useRef({ recording, active, enabled });
  useLayoutEffect(() => {
    live.current = { recording, active, enabled };
  });
  const cancel = useCallback(() => {
    controller.current?.abort();
  }, []);
  useEffect(() => cancel, [recording?.uri, active, enabled, cancel]);
  const start = useCallback(async () => {
    const current = live.current;
    if (controller.current || !current.active || !current.enabled || !current.recording?.hasAudio)
      return;
    const job = randomUUID();
    const abort = new AbortController();
    controller.current = abort;
    const uri = current.recording.uri;
    setBusy(true);
    setProgress(0);
    cues.say({
      id: 'feedback.voiceAnalysisStart',
      category: 'system',
      text: strings.feedback.voiceWorking,
    });
    try {
      const summary = await analyseRecordedVoice(uri, job, abort.signal, setProgress);
      if (abort.signal.aborted || !live.current.active) return;
      const latest = useSession.getState().lastRecording;
      if (latest?.uri === uri)
        useSession.getState().setLastRecording({ ...latest, voiceSummary: summary });
      cues.say({
        id: `feedback.voiceAnalysisDone.${job}`,
        category: 'system',
        text: strings.feedback.voiceSummary(
          summary,
          useSettings.getState().verbosity === 'detailed',
        ),
        earcon: 'chime',
      });
    } catch {
      if (!abort.signal.aborted && live.current.active)
        cues.say({
          id: 'feedback.voiceAnalysisError',
          category: 'system',
          text: strings.feedback.voiceUnavailable,
          earcon: 'error',
        });
    } finally {
      if (controller.current === abort) {
        controller.current = null;
        setBusy(false);
      }
    }
  }, []);
  return { busy, progress, start, cancel };
}
