// Which output channels a cue may use right now. Pure logic.

import type { CueType, RecordingCueMode } from '@/store/settingsStore';

export interface ChannelInputs {
  isRecording: boolean;
  recordingCues: RecordingCueMode;
  earphonesConnected: boolean;
  cueType: CueType;
  screenReaderOn: boolean;
}

export type SpeechRoute = 'tts' | 'screenReader' | 'off';

export interface ChannelPolicy {
  /** How guidance words are spoken (framing, lighting, background, feedback). */
  guidanceSpeech: SpeechRoute;
  /** How system words are spoken (recording started, saved, errors). Ignores "tone only". */
  systemSpeech: SpeechRoute;
  /** Continuous guidance tones (framing). */
  tones: boolean;
  /** Short confirmation sounds. */
  earcons: boolean;
  haptics: boolean;
}

/**
 * While recording, anything played on the loudspeaker ends up in the video:
 * - earphonesOnly: sound only through earphones, otherwise vibration only
 * - pause: no cues at all
 * - always: everything, even on the loudspeaker
 * With VoiceOver / TalkBack on, words go through the screen reader so two voices never overlap.
 */
export function channelPolicy(input: ChannelInputs): ChannelPolicy {
  const audioAllowed =
    !input.isRecording ||
    input.recordingCues === 'always' ||
    (input.recordingCues === 'earphonesOnly' && input.earphonesConnected);
  const haptics = !input.isRecording || input.recordingCues !== 'pause';

  const speechRoute: SpeechRoute = !audioAllowed
    ? 'off'
    : input.screenReaderOn
      ? 'screenReader'
      : 'tts';

  return {
    guidanceSpeech: input.cueType === 'tone' ? 'off' : speechRoute,
    systemSpeech: speechRoute,
    tones: audioAllowed && input.cueType !== 'voice',
    earcons: audioAllowed,
    haptics,
  };
}

export interface AudioDeviceLike {
  category: string;
}

export interface AudioDevicesLike {
  currentOutputs: AudioDeviceLike[];
  availableOutputs: AudioDeviceLike[];
}

// iOS reports AVAudioSession port types for the current route.
const IOS_PRIVATE_PORTS = new Set([
  'Headphones',
  'BluetoothA2DPOutput',
  'BluetoothHFP',
  'BluetoothLE',
  'USBAudio',
]);

// Android lists connected devices; audio routes to headphones automatically when present.
// 22 = TYPE_USB_HEADSET, 26 = TYPE_BLE_HEADSET.
const ANDROID_PRIVATE_DEVICES = new Set([
  'Wired Headset',
  'Wired Headphones',
  'Bluetooth A2DP',
  'Bluetooth SCO',
  'Other (22)',
  'Other (26)',
]);

/** True when sound goes to earphones (wired, Bluetooth or USB), not the loudspeaker. */
export function hasEarphones(info: AudioDevicesLike, platform: 'ios' | 'android'): boolean {
  if (platform === 'ios') {
    return info.currentOutputs.some((d) => IOS_PRIVATE_PORTS.has(d.category));
  }
  return info.availableOutputs.some((d) => ANDROID_PRIVATE_DEVICES.has(d.category));
}
