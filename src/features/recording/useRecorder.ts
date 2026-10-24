import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  CommonResolutions,
  useVideoOutput,
  type CameraOutput,
  type Recorder,
} from 'react-native-vision-camera';

import { applyAudioSession } from '@/audio/audioSession';
import { cues } from '@/cues';
import { useSession, type RecordingInfo } from '@/store/sessionStore';

import { deleteRecording, keepRecording, saveToPhotos } from './files';

const CONFIGURE_TIMEOUT_MS = 4000;

export interface RecorderCallbacks {
  onStarted: () => void;
  onCaptured?: (info: RecordingInfo) => RecordingInfo;
  onFinished: (info: RecordingInfo) => void;
  onError: (error: unknown) => void;
}

interface Attempt {
  starting: boolean;
  cancelled: boolean;
  terminal: boolean;
  recorder?: Recorder;
  startedAt: number;
  stoppedAt?: number;
  wake?: () => void;
  photos: AbortController;
}

/** Own each native start through completion, including focus loss during async startup. */
export function useRecorder(micAllowed: boolean, callbacks: RecorderCallbacks, active = true) {
  const [audioWanted, setAudioWanted] = useState(false);
  const enableAudio = audioWanted && micAllowed;
  const videoOutput = useVideoOutput({
    targetResolution: CommonResolutions.FHD_16_9,
    enableAudio,
  });
  const outputRef = useRef(videoOutput);
  const outputHasAudio = useRef(enableAudio);
  const waiters = useRef(new Set<{ audio: boolean; finish: () => void }>());
  const attemptRef = useRef<Attempt | null>(null);
  const callbacksRef = useRef(callbacks);
  const mounted = useRef(true);
  const live = useRef(active);
  const pendingFinished = useRef<RecordingInfo | null>(null);

  useLayoutEffect(() => {
    outputRef.current = videoOutput;
    outputHasAudio.current = enableAudio;
    callbacksRef.current = callbacks;
  });

  const setPhase = useSession((s) => s.setRecordingPhase);
  const markStarted = useSession((s) => s.startRecording);
  const markStopped = useSession((s) => s.stopRecording);
  const setLastRecording = useSession((s) => s.setLastRecording);

  const onConfigured = useCallback(() => {
    applyAudioSession();
    for (const waiter of waiters.current) {
      if (waiter.audio === outputHasAudio.current) waiter.finish();
    }
  }, []);

  const waitForOutput = (attempt: Attempt, audio: boolean) =>
    new Promise<void>((resolve) => {
      const waiter = {
        audio,
        finish: () => {
          clearTimeout(timer);
          waiters.current.delete(waiter);
          attempt.wake = undefined;
          resolve();
        },
      };
      const timer = setTimeout(waiter.finish, CONFIGURE_TIMEOUT_MS);
      attempt.wake = waiter.finish;
      waiters.current.add(waiter);
    });

  const releaseAudio = useCallback(() => {
    if (mounted.current) setAudioWanted(false);
    markStopped();
    cues.configure({ isRecording: false });
  }, [markStopped]);

  const complete = useCallback(
    (attempt: Attempt) => {
      if (attemptRef.current !== attempt) return;
      attempt.wake?.();
      attemptRef.current = null;
      releaseAudio();
    },
    [releaseAudio],
  );

  const start = useCallback(async () => {
    if (
      !mounted.current ||
      !live.current ||
      attemptRef.current ||
      useSession.getState().recordingPhase !== 'idle'
    )
      return;
    const attempt: Attempt = {
      starting: true,
      cancelled: false,
      terminal: false,
      startedAt: Date.now(),
      photos: new AbortController(),
    };
    attemptRef.current = attempt;
    setPhase('starting');
    cues.configure({ isRecording: true });
    cues.clear('guidance');
    const owns = () => attemptRef.current === attempt;
    const fail = (error: unknown) => {
      if (!owns() || attempt.terminal || attempt.cancelled) return;
      attempt.terminal = true;
      complete(attempt);
      if (mounted.current) callbacksRef.current.onError(error);
    };
    try {
      if (micAllowed && !outputHasAudio.current) {
        const attached = waitForOutput(attempt, true);
        setAudioWanted(true);
        await attached;
      }
      if (attempt.cancelled || !owns()) {
        complete(attempt);
        return;
      }
      const recorder = await outputRef.current.createRecorder({});
      attempt.recorder = recorder;
      if (attempt.cancelled || !owns()) {
        complete(attempt);
        return;
      }
      const hasAudio = outputHasAudio.current;
      // Native completion/error may arrive before its start promise resolves.
      attempt.startedAt = Date.now();
      await recorder.startRecording(async (path) => {
        if (attempt.cancelled) {
          deleteRecording(path.startsWith('file://') ? path : `file://${path}`);
          return;
        }
        if (!owns() || attempt.terminal) return;
        attempt.terminal = true;
        const durationMs = Math.max(0, (attempt.stoppedAt ?? Date.now()) - attempt.startedAt);
        try {
          const uri = keepRecording(path);
          const base: RecordingInfo = { uri, durationMs, hasAudio, savedToPhotos: false };
          const info =
            mounted.current && !attempt.starting
              ? (callbacksRef.current.onCaptured?.(base) ?? base)
              : base;
          releaseAudio();
          setPhase('stopping');
          const saved = await saveToPhotos(uri, false, attempt.photos.signal);
          // Leaving during a save is not evidence that Photos permission was denied.
          if (saved === 'saved' || !attempt.photos.signal.aborted) info.autoSaveResult = saved;
          info.savedToPhotos = saved === 'saved';
          setLastRecording(info);
          complete(attempt);
          if (mounted.current) {
            if (live.current) callbacksRef.current.onFinished(info);
            else pendingFinished.current = info;
          }
        } catch (error) {
          complete(attempt);
          if (mounted.current) callbacksRef.current.onError(error);
        }
      }, fail);
      if (attempt.cancelled) {
        // No native cancellation API exists for the start promise itself. Retain ownership
        // until it resolves, then cancel that exact recorder before allowing another start.
        if (!attempt.terminal) {
          try {
            await recorder.cancelRecording();
          } catch {
            try {
              await recorder.stopRecording();
            } catch (error) {
              console.warn('Could not stop interrupted recording startup', error);
            }
          }
        }
        complete(attempt);
        return;
      }
      if (!owns() || attempt.terminal) return;
      attempt.starting = false;
      attempt.startedAt = Date.now();
      markStarted(attempt.startedAt);
      applyAudioSession();
      callbacksRef.current.onStarted();
    } catch (error) {
      if (attempt.cancelled) complete(attempt);
      else fail(error);
    }
  }, [micAllowed, markStarted, complete, releaseAudio, setLastRecording, setPhase]);

  const stop = useCallback(async () => {
    const attempt = attemptRef.current;
    if (
      !attempt?.recorder ||
      attempt.starting ||
      attempt.terminal ||
      useSession.getState().recordingPhase !== 'recording'
    )
      return;
    setPhase('stopping');
    attempt.stoppedAt = Date.now();
    try {
      await attempt.recorder.stopRecording();
    } catch (error) {
      if (attemptRef.current !== attempt || attempt.terminal) return;
      attempt.terminal = true;
      complete(attempt);
      if (mounted.current) callbacksRef.current.onError(error);
    }
  }, [complete, setPhase]);

  const interrupt = useCallback(() => {
    const attempt = attemptRef.current;
    if (!attempt) return;
    attempt.photos.abort();
    if (attempt.starting && !attempt.terminal) {
      attempt.cancelled = true;
      // Keep the startup cue policy until pending native work has actually been cleaned up.
      attempt.wake?.();
    } else if (!attempt.terminal) {
      void stop();
    }
  }, [stop]);

  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      live.current = false;
      interrupt();
    };
  }, [interrupt]);

  useLayoutEffect(() => {
    live.current = active;
    if (!active) interrupt();
    else if (pendingFinished.current) {
      const info = pendingFinished.current;
      pendingFinished.current = null;
      callbacksRef.current.onFinished(info);
    }
  }, [active, interrupt]);

  const outputs = useMemo<CameraOutput[]>(() => [videoOutput], [videoOutput]);
  return useMemo(
    () => ({ outputs, onConfigured, start, stop, interrupt }),
    [outputs, onConfigured, start, stop, interrupt],
  );
}
