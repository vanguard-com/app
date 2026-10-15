import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { VisionCamera } from 'react-native-vision-camera';

import { cues, speakAndWait } from '@/cues';
import { strings } from '@/i18n';

const t = strings.permissions;

// Ask the system at most once per app run; after that, only explain how to enable it.
const askedThisRun = new Set<'camera' | 'microphone' | 'speech'>();

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
export async function ensureCameraPermission(): Promise<boolean> {
  if (cameraStatus() === 'authorized') return true;
  if (cameraStatus() !== 'restricted' && !askedThisRun.has('camera')) {
    askedThisRun.add('camera');
    await speakAndWait(t.camera.explain);
    await VisionCamera.requestCameraPermission();
    if (cameraStatus() === 'authorized') return true;
  }
  sayDenied('perm.camera.denied', t.camera.denied);
  return false;
}

export async function ensureMicrophonePermission(): Promise<boolean> {
  if (microphoneStatus() === 'authorized') return true;
  if (microphoneStatus() !== 'restricted' && !askedThisRun.has('microphone')) {
    askedThisRun.add('microphone');
    await speakAndWait(t.microphone.explain);
    await VisionCamera.requestMicrophonePermission();
    if (microphoneStatus() === 'authorized') return true;
  }
  sayDenied('perm.mic.denied', t.microphone.denied);
  return false;
}

export function hasMicrophonePermission(): boolean {
  return microphoneStatus() === 'authorized';
}

/** Speech recognition (iOS asks separately; Android only needs the microphone). */
export async function ensureSpeechPermission(): Promise<boolean> {
  try {
    const current = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (current.granted) return true;
    if (current.canAskAgain && !askedThisRun.has('speech')) {
      askedThisRun.add('speech');
      await speakAndWait(t.speech.explain);
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (result.granted) return true;
    }
  } catch (error) {
    console.warn('Speech permission check failed', error);
  }
  sayDenied('perm.speech.denied', t.speech.denied);
  return false;
}

export async function hasSpeechPermission(): Promise<boolean> {
  try {
    return (await ExpoSpeechRecognitionModule.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}
