import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { VisionCamera } from 'react-native-vision-camera';
import * as MediaLibrary from 'expo-media-library/legacy';
import { Platform } from 'react-native';

import { cues, speakAndWait } from '@/cues';
import { strings } from '@/i18n';

const t = strings.permissions;

// Ask the system at most once per app run; after that, only explain how to enable it.
const askedThisRun = new Set<'camera' | 'microphone' | 'speech' | 'photos'>();
const pendingRequests = new Map<PermissionKind, Promise<boolean>>();

/** A permission dialog can temporarily deactivate the app. Re-entry joins the same request. */
async function nativeRequest(kind: PermissionKind, request: () => Promise<boolean>) {
  const current = pendingRequests.get(kind);
  if (current) return current;
  const pending = request();
  pendingRequests.set(kind, pending);
  try {
    return await pending;
  } finally {
    if (pendingRequests.get(kind) === pending) pendingRequests.delete(kind);
  }
}

async function resultOf(
  kind: 'camera' | 'microphone' | 'speech',
  pending: Promise<boolean>,
  signal?: AbortSignal,
) {
  const granted = await pending;
  if (!granted && !signal?.aborted) sayDenied(`perm.${kind}.denied`, t[kind].denied);
  return granted;
}

// Functions (not property reads) so TypeScript does not narrow the status across awaits.
const cameraStatus = () => VisionCamera.cameraPermissionStatus;
const microphoneStatus = () => VisionCamera.microphonePermissionStatus;

function sayDenied(id: string, text: string): void {
  cues.say({ id, category: 'system', text, earcon: 'error' });
}

/**
 * Explain by voice, then show the system dialog. On denial, explain what will not work and how
 * to turn it on later. Returns true when access is granted.
 */
export async function ensureCameraPermission(signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) return false;
  const pending = pendingRequests.get('camera');
  if (pending) return resultOf('camera', pending, signal);
  if (cameraStatus() === 'authorized') return true;
  if (cameraStatus() !== 'restricted' && !askedThisRun.has('camera')) {
    askedThisRun.add('camera');
    await speakAndWait(t.camera.explain, 'perm.camera.explain', signal);
    if (signal?.aborted) {
      askedThisRun.delete('camera');
      return false;
    }
    return resultOf(
      'camera',
      nativeRequest('camera', () => VisionCamera.requestCameraPermission()),
      signal,
    );
  }
  if (!signal?.aborted) sayDenied('perm.camera.denied', t.camera.denied);
  return false;
}

export async function ensureMicrophonePermission(signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) return false;
  const pending = pendingRequests.get('microphone');
  if (pending) return resultOf('microphone', pending, signal);
  if (microphoneStatus() === 'authorized') return true;
  if (microphoneStatus() !== 'restricted' && !askedThisRun.has('microphone')) {
    askedThisRun.add('microphone');
    await speakAndWait(t.microphone.explain, 'perm.microphone.explain', signal);
    if (signal?.aborted) {
      askedThisRun.delete('microphone');
      return false;
    }
    return resultOf(
      'microphone',
      nativeRequest('microphone', () => VisionCamera.requestMicrophonePermission()),
      signal,
    );
  }
  if (!signal?.aborted) sayDenied('perm.mic.denied', t.microphone.denied);
  return false;
}

export function hasMicrophonePermission(): boolean {
  return microphoneStatus() === 'authorized';
}

/** Speech recognition (iOS asks separately; Android only needs the microphone). */
export async function ensureSpeechPermission(signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) return false;
  const pending = pendingRequests.get('speech');
  if (pending) return resultOf('speech', pending, signal);
  if (Platform.OS === 'android' && !hasMicrophonePermission()) {
    sayDenied('perm.speech.microphone', t.speechRequiresMic);
    return false;
  }
  try {
    const current =
      Platform.OS === 'ios'
        ? await ExpoSpeechRecognitionModule.getSpeechRecognizerPermissionsAsync()
        : await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (signal?.aborted) return false;
    if (current.granted) return true;
    if (current.canAskAgain && !askedThisRun.has('speech')) {
      askedThisRun.add('speech');
      await speakAndWait(t.speech.explain, 'perm.speech.explain', signal);
      if (signal?.aborted) {
        askedThisRun.delete('speech');
        return false;
      }
      return await resultOf(
        'speech',
        nativeRequest('speech', async () => {
          const result =
            Platform.OS === 'ios'
              ? await ExpoSpeechRecognitionModule.requestSpeechRecognizerPermissionsAsync()
              : await ExpoSpeechRecognitionModule.requestPermissionsAsync();
          return result.granted;
        }),
        signal,
      );
    }
  } catch (error) {
    console.warn('Speech permission check failed', error);
  }
  if (!signal?.aborted) sayDenied('perm.speech.denied', t.speech.denied);
  return false;
}

export async function hasSpeechPermission(): Promise<boolean> {
  try {
    return (await ExpoSpeechRecognitionModule.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export const PERMISSION_KINDS = ['camera', 'microphone', 'speech', 'photos'] as const;
export type PermissionKind = (typeof PERMISSION_KINDS)[number];
export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

export async function getPermissionStatus(kind: PermissionKind): Promise<PermissionStatus> {
  if (kind === 'camera' || kind === 'microphone') {
    const status = kind === 'camera' ? cameraStatus() : microphoneStatus();
    return { granted: status === 'authorized', canAskAgain: status !== 'restricted' };
  }
  const status =
    kind === 'speech'
      ? await (Platform.OS === 'ios'
          ? ExpoSpeechRecognitionModule.getSpeechRecognizerPermissionsAsync()
          : ExpoSpeechRecognitionModule.getPermissionsAsync())
      : await MediaLibrary.getPermissionsAsync(true);
  return { granted: status.granted, canAskAgain: status.canAskAgain };
}

/** Add-only access; sharing the saved app copy never requires this permission. */
export async function ensurePhotosPermission(
  signal?: AbortSignal,
  retry = false,
  requestIfMissing = true,
): Promise<boolean> {
  if (signal?.aborted) return false;
  const pending = pendingRequests.get('photos');
  if (pending) return pending;
  const current = await MediaLibrary.getPermissionsAsync(true);
  if (signal?.aborted) return false;
  if (current.granted || !current.canAskAgain) return current.granted;
  if (!requestIfMissing) return false;
  if (askedThisRun.has('photos') && !retry) return false;
  askedThisRun.add('photos');
  await speakAndWait(t.photos.explain, 'perm.photos.explain', signal);
  if (signal?.aborted) {
    askedThisRun.delete('photos');
    return false;
  }
  return nativeRequest(
    'photos',
    async () => (await MediaLibrary.requestPermissionsAsync(true)).granted,
  );
}

export async function requestPermission(
  kind: PermissionKind,
  signal?: AbortSignal,
): Promise<boolean> {
  if (signal?.aborted) return false;
  askedThisRun.delete(kind);
  switch (kind) {
    case 'camera':
      return ensureCameraPermission(signal);
    case 'microphone':
      return ensureMicrophonePermission(signal);
    case 'speech':
      return ensureSpeechPermission(signal);
    case 'photos': {
      const granted = await ensurePhotosPermission(signal, true);
      if (!granted && !signal?.aborted) sayDenied('perm.photos.denied', strings.review.saveDenied);
      return granted;
    }
  }
}

export function deferPermission(kind: PermissionKind): void {
  askedThisRun.add(kind);
}
