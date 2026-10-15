import { Platform } from 'react-native';
import { AudioManager } from 'react-native-audio-api';

// One iOS audio setup shared by camera recording, speech, tones and voice commands:
// - playAndRecord: play cues while the microphone records
// - defaultToSpeaker: loudspeaker when no earphones (otherwise iOS uses the quiet earpiece)
// - allowBluetoothA2DP: high quality Bluetooth earphones for output while the phone's own
//   microphone keeps recording (the Bluetooth call mic would sound like a phone call)
// - duckOthers: lower music from other apps while Lumi speaks
// - videoRecording mode: microphone tuned for video
// Android needs no session setup.
export const IOS_SESSION = {
  category: 'playAndRecord',
  mode: 'videoRecording',
  options: ['defaultToSpeaker', 'allowBluetoothA2DP', 'duckOthers'],
} as const;

/**
 * (Re)apply Lumi's audio setup. Call at start up and again after the camera starts or a recording
 * starts / stops, because AVCaptureSession reconfigures the shared session when it adds audio.
 */
export function applyAudioSession(): void {
  if (Platform.OS !== 'ios') return;
  try {
    AudioManager.setAudioSessionOptions({
      iosCategory: IOS_SESSION.category,
      iosMode: IOS_SESSION.mode,
      iosOptions: [...IOS_SESSION.options],
      iosAllowHaptics: true,
    });
  } catch (error) {
    console.warn('Could not apply audio session', error);
  }
}
