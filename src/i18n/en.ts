// All user facing text lives here so more languages can be added later.
// Functions are used where a string needs numbers or names inserted.

export const en = {
  appName: 'Lumi',

  common: {
    back: { label: 'Back', hint: 'Returns to the previous screen' },
    /** Spoken duration, e.g. 72 -> "1 minute 12 seconds". */
    duration: (totalSeconds: number) => {
      const total = Math.max(0, Math.round(totalSeconds));
      const m = Math.floor(total / 60);
      const s = total % 60;
      const minutes = m === 0 ? '' : `${m} ${m === 1 ? 'minute' : 'minutes'}`;
      const seconds = s === 0 && m > 0 ? '' : `${s} ${s === 1 ? 'second' : 'seconds'}`;
      return [minutes, seconds].filter(Boolean).join(' ');
    },
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
    starting: 'Starting camera',
    settings: { label: 'Settings', hint: 'Opens settings' },
    flip: { label: 'Flip camera', hint: 'Switches between front and back camera' },
    facing: { front: 'Front camera', back: 'Back camera' },
    recordingStarted: 'Recording',
    recordingStopped: 'Stopped',
    elapsed: (duration: string) => duration,
    timerLabel: (duration: string) => `Recording, ${duration}`,
    status: {
      idle: (facing: string, mode: string, subject: string) =>
        `Camera ready. ${facing}. ${mode} mode. Keeping ${subject} in frame.`,
      recording: (duration: string) => `Recording, ${duration}.`,
      notReady: 'Camera is not ready yet.',
    },
    record: {
      idleLabel: 'Record',
      stopLabel: 'Stop',
      idleHint: 'Records a video',
      stopHint: 'Stops the video',
      volumeHint: 'You can also press a volume button',
    },
    micOff: 'Microphone is off. Recording without sound.',
    notWhileRecording: 'Not while recording.',
    recordFailed: 'Recording failed. Please try again.',
    interrupted: 'Recording stopped because another app needed the camera or microphone.',
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
    screenAnnouncement: 'Review',
    empty: 'No recording yet',
    summary: (duration: string) => `Video length ${duration}.`,
    nextSteps: 'Use Save to keep it in your photos, or Retake for a new one.',
    save: { label: 'Save', hint: 'Saves the video to your photos' },
    savedLabel: 'Saved',
    retake: { label: 'Retake', hint: 'Deletes this video and returns to the camera' },
    saving: 'Saving',
    saved: 'Saved to Photos',
    alreadySaved: 'Already saved to Photos',
    saveDenied:
      'Photo access is off, so Lumi cannot save. To allow it, open your phone settings, find Lumi, and allow Photos.',
    saveFailed: 'Saving did not work. Please try again.',
    deleted: 'Video deleted',
  },

  permissions: {
    camera: {
      explain: 'Lumi needs the camera to see and record you. Your phone will now ask for access.',
      denied:
        'Camera access is off, so Lumi cannot see or record. To allow it, open your phone settings, find Lumi, and allow Camera.',
      screenText: 'Camera access is off',
    },
    microphone: {
      explain:
        'Lumi records sound with your video and listens for spoken commands. Your phone will now ask for microphone access.',
      denied:
        'Microphone access is off, so videos have no sound and spoken commands do not work. To allow it, open your phone settings, find Lumi, and allow Microphone.',
    },
    speech: {
      explain:
        'Lumi can follow spoken commands. Your phone will now ask for speech recognition access.',
      denied:
        'Speech recognition is off, so spoken commands do not work. Buttons and the volume button still work.',
    },
    openSettings: { label: 'Open settings', hint: 'Opens Lumi in your phone settings' },
  },

  voice: {
    // Spoken only while the recognizer is paused, so these may contain command phrases.
    help: 'You can say: start recording, stop recording, switch camera, save video, retake video, or help.',
    notYet: 'That command comes in a later update.',
    unavailable: 'Spoken commands are not available on this phone.',
    whileRecordingOff: 'Spoken commands pause while recording. Press a volume button to stop.',
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
    contact: (email: string) => `Contact: ${email}`,
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
