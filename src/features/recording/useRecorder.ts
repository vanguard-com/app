import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  CommonResolutions,
  useVideoOutput,
  type CameraOutput,
  type Recorder,
} from 'react-native-vision-camera';

import { applyAudioSession } from '@/audio/audioSession';
import { useSession, type RecordingInfo } from '@/store/sessionStore';

import { keepRecording, saveToPhotos } from './files';

// If the camera never confirms the microphone was attached, record anyway after this long.
const CONFIGURE_TIMEOUT_MS = 4000;

export interface RecorderCallbacks {
  onStarted: () => void;
  onCaptured?: (info: RecordingInfo) => RecordingInfo;
  onFinished: (info: RecordingInfo) => void;
  onError: (error: unknown) => void;
}

/**
 * Video recording on top of VisionCamera v5.
 *
 * The microphone is attached to the camera only while recording. That keeps the microphone free
 * for voice commands the rest of the time ("start recording" has to be heard before recording).
 * Starting therefore takes a moment: attach audio, wait for the camera to reconfigure, record.
 */
export function useRecorder(micAllowed: boolean, callbacks: RecorderCallbacks) {
  const [audioWanted, setAudioWanted] = useState(false);
  const enableAudio = audioWanted && micAllowed;
  const videoOutput = useVideoOutput({
    targetResolution: CommonResolutions.FHD_16_9,
    enableAudio,
  });

  const outputRef = useRef(videoOutput);
  const outputHasAudio = useRef(enableAudio);
  const waiters = useRef<{ audio: boolean; resolve: () => void }[]>([]);
  const recorderRef = useRef<Recorder | null>(null);
  const startedAtRef = useRef(0);
  const stoppedAtRef = useRef<number | null>(null);
  const callbacksRef = useRef(callbacks);

  // Layout effects run right after each commit, before the camera's async reconfiguration
  // reports back through onConfigured.
  useLayoutEffect(() => {
    outputRef.current = videoOutput;
    outputHasAudio.current = enableAudio;
  }, [videoOutput, enableAudio]);
  useLayoutEffect(() => {
    callbacksRef.current = callbacks;
  });

  const setPhase = useSession((s) => s.setRecordingPhase);
  const markStarted = useSession((s) => s.startRecording);
  const markStopped = useSession((s) => s.stopRecording);
  const setLastRecording = useSession((s) => s.setLastRecording);

  /** Pass to <Camera onConfigured>. */
  const onConfigured = useCallback(() => {
    // AVCaptureSession may have changed the shared iOS audio session; put Lumi's back.
    applyAudioSession();
    const ready = waiters.current.filter((w) => w.audio === outputHasAudio.current);
    waiters.current = waiters.current.filter((w) => !ready.includes(w));
    ready.forEach((w) => w.resolve());
  }, []);

  const waitForOutput = (audio: boolean) =>
    new Promise<void>((resolve) => {
      waiters.current.push({ audio, resolve });
      setTimeout(resolve, CONFIGURE_TIMEOUT_MS);
    });

  const reset = useCallback(() => {
    recorderRef.current = null;
    setAudioWanted(false);
    markStopped();
  }, [markStopped]);

  const start = useCallback(async () => {
    if (useSession.getState().recordingPhase !== 'idle') return;
    setPhase('starting');
    try {
      if (micAllowed && !outputHasAudio.current) {
        const attached = waitForOutput(true);
        setAudioWanted(true);
        await attached;
      }
      const recorder = await outputRef.current.createRecorder({});
      recorderRef.current = recorder;
      stoppedAtRef.current = null;
      const hasAudio = outputHasAudio.current;
      await recorder.startRecording(
        async (path) => {
          const durationMs = Math.max(
            0,
            (stoppedAtRef.current ?? Date.now()) - startedAtRef.current,
          );
          try {
            const uri = keepRecording(path);
            const base: RecordingInfo = { uri, durationMs, hasAudio, savedToPhotos: false };
            const info = callbacksRef.current.onCaptured?.(base) ?? base;
            // Capture is finished. Release the mic and recording cue policy before explaining
            // Photos permission, while keeping the UI busy until saving completes.
            reset();
            setPhase('stopping');
            info.autoSaveResult = await saveToPhotos(uri);
            info.savedToPhotos = info.autoSaveResult === 'saved';
            setLastRecording(info);
            reset();
            callbacksRef.current.onFinished(info);
          } catch (error) {
            reset();
            callbacksRef.current.onError(error);
          }
        },
        (error) => {
          reset();
          callbacksRef.current.onError(error);
        },
      );
      startedAtRef.current = Date.now();
      markStarted(startedAtRef.current);
      applyAudioSession();
      callbacksRef.current.onStarted();
    } catch (error) {
      reset();
      callbacksRef.current.onError(error);
    }
  }, [micAllowed, markStarted, reset, setLastRecording, setPhase]);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || useSession.getState().recordingPhase !== 'recording') return;
    setPhase('stopping');
    stoppedAtRef.current = Date.now();
    try {
      // The finished callback passed to startRecording does the rest.
      await recorder.stopRecording();
    } catch (error) {
      reset();
      callbacksRef.current.onError(error);
    }
  }, [reset, setPhase]);

  const outputs = useMemo<CameraOutput[]>(() => [videoOutput], [videoOutput]);
  return useMemo(
    () => ({ outputs, onConfigured, start, stop }),
    [outputs, onConfigured, start, stop],
  );
}
