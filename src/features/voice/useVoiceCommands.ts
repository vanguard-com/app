import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionOptions,
} from 'expo-speech-recognition';

import { IOS_SESSION } from '@/audio/audioSession';
import { cues } from '@/cues';

import { isSpeechClaimed, onSpeechClaimChange } from './speechLease';

import { COMMAND_HINTS, parseCommand, type VoiceCommand } from './commands';

const LANGUAGE = 'en-US';
// Ignore a second match of the same utterance (interim result followed by the final one).
const COMMAND_COOLDOWN_MS = 1500;
const RESTART_DELAY_MS = 350;
const MAX_BACKOFF_MS = 10_000;
// Android 13+ supports continuous listening; older versions stop after each phrase.
const CONTINUOUS = Platform.OS === 'ios' || (Platform.OS === 'android' && Platform.Version >= 33);

let onDevicePreference: Promise<boolean> | null = null;

/** Use on device recognition when the phone has it (D19), otherwise the system speech service. */
function prefersOnDevice(): Promise<boolean> {
  onDevicePreference ??= (async () => {
    try {
      if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) return false;
      if (Platform.OS !== 'android') return true;
      const { installedLocales } = await ExpoSpeechRecognitionModule.getSupportedLocales({});
      return installedLocales.some((l) => l.toLowerCase().startsWith('en'));
    } catch {
      return false;
    }
  })();
  return onDevicePreference;
}

/**
 * Listens for voice commands while `enabled`. Pauses whenever Lumi itself is speaking so it never
 * hears its own voice, and restarts after each phrase, error or time limit.
 */
export function useVoiceCommands(enabled: boolean, onCommand: (command: VoiceCommand) => void) {
  const enabledRef = useRef(enabled);
  const onCommandRef = useRef(onCommand);
  const runningRef = useRef(false);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(RESTART_DELAY_MS);
  const lastCommandAt = useRef(0);
  const forceServerRef = useRef(false);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  const stop = () => {
    if (restartTimer.current) clearTimeout(restartTimer.current);
    restartTimer.current = null;
    if (runningRef.current) {
      runningRef.current = false;
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // Already stopped.
      }
    }
  };

  const start = async () => {
    if (!enabledRef.current || runningRef.current || cues.isAudioBusy() || isSpeechClaimed())
      return;
    runningRef.current = true;
    const onDevice = !forceServerRef.current && (await prefersOnDevice());
    if (!enabledRef.current || isSpeechClaimed()) {
      runningRef.current = false;
      return;
    }
    const options: ExpoSpeechRecognitionOptions = {
      lang: LANGUAGE,
      interimResults: true,
      continuous: CONTINUOUS,
      maxAlternatives: 1,
      requiresOnDeviceRecognition: onDevice,
      contextualStrings: COMMAND_HINTS,
      iosTaskHint: 'confirmation',
      iosCategory: {
        category: IOS_SESSION.category,
        categoryOptions: [...IOS_SESSION.options],
        mode: IOS_SESSION.mode,
      },
    };
    try {
      ExpoSpeechRecognitionModule.start(options);
    } catch (error) {
      console.warn('Speech recognition failed to start', error);
      runningRef.current = false;
      scheduleRestart(true);
    }
  };

  const scheduleRestart = (afterError: boolean) => {
    if (!enabledRef.current || isSpeechClaimed()) return;
    if (restartTimer.current) clearTimeout(restartTimer.current);
    backoffRef.current = afterError
      ? Math.min(MAX_BACKOFF_MS, backoffRef.current * 2)
      : RESTART_DELAY_MS;
    restartTimer.current = setTimeout(() => {
      restartTimer.current = null;
      start();
    }, backoffRef.current);
  };

  useSpeechRecognitionEvent('result', (event) => {
    if (!enabledRef.current || cues.isAudioBusy() || isSpeechClaimed()) return;
    const transcript = event.results[0]?.transcript ?? '';
    const command = parseCommand(transcript);
    if (!command) return;
    const now = Date.now();
    if (now - lastCommandAt.current < COMMAND_COOLDOWN_MS) return;
    lastCommandAt.current = now;
    backoffRef.current = RESTART_DELAY_MS;
    // Clear the transcript so the same words are not matched again.
    stop();
    onCommandRef.current(command);
    scheduleRestart(false);
  });

  useSpeechRecognitionEvent('end', () => {
    runningRef.current = false;
    scheduleRestart(false);
  });

  useSpeechRecognitionEvent('error', (event) => {
    runningRef.current = false;
    switch (event.error) {
      case 'not-allowed':
      case 'service-not-allowed':
        enabledRef.current = false;
        return;
      case 'language-not-supported':
        // On device pack missing: fall back to the system speech service.
        forceServerRef.current = true;
        scheduleRestart(false);
        return;
      case 'no-speech':
      case 'speech-timeout':
      case 'aborted':
        scheduleRestart(false);
        return;
      default:
        scheduleRestart(true);
    }
  });

  useEffect(
    () =>
      onSpeechClaimChange((claimed) => {
        if (claimed) stop();
        else scheduleRestart(false);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Pause while Lumi speaks.
  useEffect(
    () =>
      cues.onSpeakingChange((speaking) => {
        if (speaking) stop();
        else scheduleRestart(false);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    enabledRef.current = enabled;
    if (enabled) {
      backoffRef.current = RESTART_DELAY_MS;
      start();
    } else {
      stop();
    }
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
