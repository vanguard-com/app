// All user facing text lives here so more languages can be added later.
// Functions are used where a string needs numbers or names inserted.

export const en = {
  appName: 'Lumi',

  common: {
    back: { label: 'Back', hint: 'Returns to the previous screen' },
    on: 'On',
    off: 'Off',
    doubleTapToChange: 'Double tap to change, or swipe up or down',
    toggleHint: (isOn: boolean) => `Double tap to turn ${isOn ? 'off' : 'on'}`,
  },

  onboarding: {
    title: 'Welcome to Lumi',
    screenAnnouncement: 'Welcome to Lumi',
    intro:
      'Lumi helps you film yourself without looking at the screen. It guides you with sound, voice and vibration.',
    start: {
      label: 'Start',
      hint: 'Finishes the welcome and opens the camera',
    },
  },

  camera: {
    screenAnnouncement: 'Camera. Record button at bottom centre.',
    preview: {
      label: 'Camera view',
      hint: 'Double tap to hear current status',
    },
    placeholder: 'Camera starts in the next build phase',
    settings: { label: 'Settings', hint: 'Opens settings' },
    flip: { label: 'Flip camera', hint: 'Switches between front and back camera' },
    facing: { front: 'Front camera', back: 'Back camera' },
    recordingStarted: 'Recording',
    recordingStopped: 'Recording stopped',
    timer: (minutes: number, seconds: number) =>
      `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`,
    statusPlaceholder: 'Camera guidance is not active yet',
    record: {
      startLabel: 'Start recording',
      stopLabel: 'Stop recording',
      hint: 'You can also press a volume button',
    },
    mode: {
      label: (mode: string) => `Mode: ${mode}`,
      hint: 'Double tap to switch guidance mode',
    },
    subject: {
      label: (subject: string) => `Subject: ${subject}`,
      hint: 'Opens subject setup',
    },
    modes: {
      framing: 'Framing',
      lighting: 'Lighting',
      feedback: 'Feedback',
      background: 'Background',
    },
  },

  subject: {
    title: 'Subject setup',
    screenAnnouncement: 'Subject setup. What should I keep in frame?',
    prompt: 'What should I keep in frame?',
    options: {
      face: 'My face',
      person: 'My whole body',
    },
    pick: { hint: 'Sets this as the subject to keep in frame' },
    selected: (name: string) => `${name} selected`,
  },

  review: {
    title: 'Review',
    screenAnnouncement: 'Review. Summary of your last recording.',
    empty: 'No recording yet',
    retake: { label: 'Retake', hint: 'Returns to the camera to record again' },
  },

  settings: {
    title: 'Settings',
    screenAnnouncement: 'Settings',
    groups: {
      sound: { label: 'Sound and speech', hint: 'Verbosity, cue type, voice speed, cue volume' },
      feedback: { label: 'Live feedback', hint: 'Eye contact, expression, posture and voice tips' },
      camera: {
        label: 'Camera and recording',
        hint: 'Cues while recording, lens switching, time announcements',
      },
      more: { label: 'More', hint: 'Scene description, tutorial, privacy and about' },
    },
    verbosity: {
      label: 'Verbosity',
      values: { minimal: 'Minimal', standard: 'Standard', detailed: 'Detailed' },
    },
    cueType: {
      label: 'Cue type',
      values: { tone: 'Tone only', voice: 'Voice only', both: 'Tone and voice' },
    },
    voiceRate: { label: 'Voice speed', value: (pct: number) => `${pct}%` },
    cueVolume: { label: 'Cue volume', value: (pct: number) => `${pct}%` },
    liveFeedback: { label: 'Live feedback' },
    feedbackTypes: {
      label: 'Choose feedback types',
      hint: 'Turn eye contact, expression, posture and voice tips on or off',
    },
    eyeContact: { label: 'Eye contact' },
    expression: { label: 'Facial expression' },
    posture: { label: 'Posture' },
    voice: { label: 'Voice' },
    recordingCues: {
      label: 'Cues during recording',
      values: {
        earphonesOnly: 'Earphones only',
        pause: 'Pause cues',
        always: 'Always on',
      },
    },
    autoLens: { label: 'Auto lens switching' },
    elapsedTime: {
      label: 'Announce recording time',
      values: { off: 'Off', s30: 'Every 30 seconds', s60: 'Every minute' },
    },
    voiceCommandsWhileRecording: { label: 'Voice commands while recording' },
    sceneModel: {
      label: 'Scene description model',
      hint: 'Standard or Detailed',
    },
    replayTutorial: { label: 'Replay tutorial', hint: 'Plays the welcome tutorial again' },
    privacy: { label: 'Privacy policy', hint: 'Opens the privacy policy in your browser' },
    about: { label: 'About Lumi', hint: 'Version and licences' },
    version: (v: string) => `Version ${v}`,
    aboutBody:
      'Lumi analyses video on your phone. Video and images never leave your phone. To understand voice commands, your phone may use Apple or Google speech recognition. Model licence notices will appear here.',
    debugEnabled: 'Debug overlay on',
    debugDisabled: 'Debug overlay off',
  },

  status: {
    good: 'Good',
    adjust: 'Needs adjustment',
    problem: 'Subject cut off',
  },
} as const;

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : { [K in keyof T]: Widen<T[K]> };

/** Shape every language file must match. */
export type Strings = Widen<typeof en>;
