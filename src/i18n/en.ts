import type { FeedbackObservation } from '@/features/feedback/model';
import type { FeedbackSummary } from '@/features/feedback/stats';
import type { VoiceSummary } from '@/features/feedback/recordedVoice';
import type { RecordingSummary } from '@/features/recording/stats';

// All user facing text lives here so more languages can be added later.
// Functions are used where a string needs numbers or names inserted.

export const en = {
  appName: 'Lumi',
  background: {
    objectLabels: [
      'person',
      'bicycle',
      'car',
      'motorcycle',
      'airplane',
      'bus',
      'train',
      'truck',
      'boat',
      'traffic light',
      'fire hydrant',
      '???',
      'stop sign',
      'parking meter',
      'bench',
      'bird',
      'cat',
      'dog',
      'horse',
      'sheep',
      'cow',
      'elephant',
      'bear',
      'zebra',
      'giraffe',
      '???',
      'backpack',
      'umbrella',
      '???',
      '???',
      'handbag',
      'tie',
      'suitcase',
      'frisbee',
      'skis',
      'snowboard',
      'sports ball',
      'kite',
      'baseball bat',
      'baseball glove',
      'skateboard',
      'surfboard',
      'tennis racket',
      'bottle',
      '???',
      'wine glass',
      'cup',
      'fork',
      'knife',
      'spoon',
      'bowl',
      'banana',
      'apple',
      'sandwich',
      'orange',
      'broccoli',
      'carrot',
      'hot dog',
      'pizza',
      'donut',
      'cake',
      'chair',
      'couch',
      'potted plant',
      'bed',
      '???',
      'dining table',
      '???',
      '???',
      'toilet',
      '???',
      'tv',
      'laptop',
      'mouse',
      'remote',
      'keyboard',
      'cell phone',
      'microwave',
      'oven',
      'toaster',
      'sink',
      'refrigerator',
      '???',
      'book',
      'clock',
      'vase',
      'scissors',
      'teddy bear',
      'hair drier',
      'toothbrush',
    ],
    title: 'Background recognition',
    waiting: 'Checking the background. Hold the phone steady.',
    noObjects:
      'No common background objects confidently detected. This does not mean the background is clear.',
    item: (label: string, position: 'left' | 'centre' | 'right') =>
      `${label} ${position === 'centre' ? 'in the centre' : `on the ${position}`}`,
    list: (items: string) => `Behind you: ${items}. Positions refer to the camera preview.`,
    warnings: {
      bright: 'Bright area behind you, possibly a window. Try turning away from it.',
      person: 'Another person may be moving into the frame.',
      clutter: 'Several objects are close to your face in the picture. Check for distractions.',
    },
    unavailable: 'Background object detection is unavailable on this phone. You can still record.',
    describe: {
      label: 'Scene description',
      hint: 'Uses an installed model on this phone, or asks before downloading Standard mode',
    },
    cancel: { label: 'Cancel', hint: 'Cancels the current download or description' },
    thinking: 'Thinking',
    description: (text: string) => `Scene description. This may contain mistakes. ${text}`,
    fallback: (list: string) => `Using the object list. ${list}`,
    idleOnly: 'Finish your recording before describing the background or changing models.',
    information: { label: 'App information', hint: 'Opens privacy information and About Lumi' },
    models: {
      label: 'Scene description models',
      hint: 'Install, switch or delete models. Downloads need your confirmation',
    },
    modelNames: { standard: 'Standard: SmolVLM2 500M', detailed: 'Detailed: Gemma 3n E2B' },
    modelHint: 'Opens model information and download controls',
    checking: 'Checking model download size and phone support. No model is downloading.',
    size: (bytes: number) => `${Math.ceil(bytes / 1000000)} megabytes`,
    consent: (name: string, size: string) =>
      `${name} needs a ${size} download, including its vision projector. Your photos stay on this phone. Download only if you agree to the model licence.`,
    standardLicense: 'SmolVLM2 uses the Apache 2.0 licence.',
    gemmaLicense:
      'Detailed uses a community conversion and quantization of Google Gemma 3n by shreyashmakadia. Gemma is provided under the Gemma Terms of Use, including its prohibited use policy. Google does not endorse Lumi. Review the terms before installing.',
    licence: { label: 'Read model licence', hint: 'Opens the model licence in your browser' },
    download: {
      label: 'Download model',
      hint: 'Confirms the stated download size and licence terms',
    },
    downloading: (progress: number) => `Downloading ${progress}%`,
    verifying: 'Verifying the downloaded model. This may take a few minutes.',
    installed: 'Model installed. You can select it in Settings.',
    notInstalled: 'Model not installed',
    selected: 'Selected model',
    select: {
      label: 'Use this model',
      hint: 'Selects this installed model for scene descriptions',
    },
    delete: {
      label: 'Delete model',
      hint: 'Deletes the downloaded model and its vision projector from this phone',
    },
    deleted: 'Model deleted',
    wifi: 'Connect to Wi-Fi to download, or enable mobile data in Download settings.',
    detailedCapacity:
      'Detailed mode is not supported on this phone. Keep Standard mode or use the object list.',
    capacity:
      'This phone does not have enough memory or free storage for this model. Keep Standard mode or use the object list.',
    detailedUnsupported:
      'Detailed mode is not supported with the verified model files currently available. Keep Standard mode.',
    catalogFailed:
      'Model information is unavailable. You can use the object list and try again later.',
    downloadFailed:
      'Download could not be completed or verified. The object list remains available.',
    cancelled: 'Cancelled',
    downloads: {
      label: 'Download settings',
      hint: 'Choose whether model downloads can use mobile data',
    },
    mobileData: 'Allow model downloads over mobile data',
    downloadPolicy:
      'Wi-Fi only by default. Models can be large. Downloads stop when you leave the app. Incomplete files are removed.',
    localOnly:
      'Objects and scene descriptions are processed on this phone. Models can make mistakes; use them as filming guidance.',
    benchmark: {
      label: 'Scene model benchmark',
      hint: 'Compare installed models on a photo from this phone',
      choose: 'Choose photo and compare models',
      chooseHint:
        'Opens the system photo picker and tests installed models sequentially. Does not download models.',
      intro:
        'Choose a photo containing a background. Both installed models run on the same local image, one at a time. Photos and results stay on this phone. No phone benchmark results have been recorded yet.',
      running: 'Running benchmark',
      missing: 'Not installed; skipped',
      failed: 'Failed or cancelled',
      result: (name: string, total: number, load: number, generation: number, text: string) =>
        `${name}. Total ${total} milliseconds. Verification and loading ${load} milliseconds. Generation ${generation} milliseconds. ${text}`,
      clear: 'Clear results',
      clearHint: 'Deletes the stored benchmark text and timings',
      noPhoto: 'No photo selected',
    },
  },

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
    linkFailed:
      'The link could not be opened. Please try again or use the support contact in About.',
  },

  onboarding: {
    title: 'Welcome to Lumi',
    screenAnnouncement: 'Welcome to Lumi',
    intro:
      'Lumi helps you film yourself without looking at the screen. It guides you with sound, voice and vibration.',
    start: {
      label: 'Learn the controls',
      hint: 'Begins the spoken tutorial and safe practice',
    },
    skip: {
      label: 'Use camera now',
      hint: 'Skips the tutorial and opens the camera; any needed access is explained first',
    },
    again: { label: 'Listen again', hint: 'Reads the instructions on this page again' },
    next: { label: 'Continue', hint: 'Moves to the next step' },
    skipLessons: {
      label: 'Set up access',
      hint: 'Skips the remaining lessons and explains optional app access',
    },
    lesson: (step: number, total: number) => `Lesson ${step} of ${total}`,
    lessons: [
      {
        title: 'Find the camera controls',
        text: 'The live camera fills the screen. Tap its centre to hear the current status. The large Record button is at the bottom centre. Flip camera is at the top right. Mode is at the lower left. Subject is at the lower right; open Subject to reach Settings. With VoiceOver or TalkBack, move focus to a control and double tap to use it.',
      },
      {
        title: 'Follow framing guidance',
        text: 'Lumi currently keeps your face in frame. A tone on the left means move the phone left; a tone on the right means move it right. A higher tone means move the phone up. The tone gets quicker near the centre. A chime and one vibration confirm good framing. Two vibrations mean part of your face is cut off. Earphones make directional tones easier to follow.',
      },
      {
        title: 'Choose guidance',
        text: 'Mode cycles through Framing, Lighting, Feedback and Background. Lighting can guide you toward better light; Light scan appears in Lighting mode. Feedback is optional and starts off. Background can list common objects. Scene descriptions need an optional model download, with its size and your permission explained first. The scene button appears in Background mode.',
      },
      {
        title: 'Record, review and share',
        text: 'The Record button starts and stops filming. Supported phones can also use a volume key. Commands pause during filming by default, so use a button to stop. Cues use earphones only during filming by default. After filming, Review offers Play, Retake, Save and Share. Voice analysis is available after pausing playback when enabled in Settings. Share opens the phone share sheet; finish posting in the app you choose. Your phone may use Apple or Google services for live spoken commands; saved-video analysis stays local.',
      },
    ],
    practice: {
      title: 'Practice the controls',
      intro:
        'If you allowed camera access, practice shows a local preview. It does not use the microphone or save a video. Use the large button to practise starting and stopping. This changes only the practice state.',
      volume:
        'You can also press a volume key to practise. With a screen reader, its own volume shortcuts may take priority; the on-screen button always works.',
      cameraNeeded:
        'On iPhone, volume-key practice needs camera access and a running preview. You can use the screen button or continue.',
      waitPreview:
        'Waiting for the camera preview before enabling volume keys. You can use the screen button now.',
      previewFailed:
        'The camera preview is unavailable. Use the screen button to practise, then continue.',
      noVolume:
        'Volume-key capture is unavailable on this phone. Use the on-screen button; normal filming can also use spoken commands after permission.',
      idle: 'Practice is stopped',
      recording: 'Practice is running',
      start: {
        label: 'Try the record button',
        hint: 'Starts the pretend recording without saving video or sound',
      },
      stop: { label: 'Try the stop button', hint: 'Stops the pretend recording' },
      started: 'Practice started. No video is being recorded.',
      stopped: 'Practice stopped. No video was saved.',
      progress: (button: boolean, volume: boolean) =>
        `${button ? 'On-screen control tried.' : 'On-screen control not yet tried.'} ${volume ? 'Volume control tried.' : 'Volume control not yet tried.'}`,
    },
    practiceLink: {
      label: 'Practise the controls',
      hint: 'Opens a camera preview if allowed, with no video or sound recording',
    },
    accessTitle: 'Set up access',
    accessStep: (step: number, total: number) => `Access ${step} of ${total}`,
    finish: {
      label: 'Open camera',
      hint: 'Completes setup and opens the camera with the access you allowed',
    },
    replayFinish: {
      label: 'Finish tutorial',
      hint: 'Returns to More settings without changing your preferences',
    },
  },

  camera: {
    screenAnnouncement: 'Camera. Record button at bottom centre.',
    compactControls:
      'For large text or a short screen, controls are in a scrollable list. The camera stays behind them. Use your screen reader scroll gesture, or swipe the list, to reach every control.',
    debugFramingOnly:
      'Framing cadence and boxes are available in Framing mode. This is not a measurement of preview frame rate.',
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
    faceOnly: 'Face tracking is available now. Whole body and object tracking will come later.',
    guidanceHelp:
      'A tone in your left ear means move the phone left; right means move it right. Higher pitch means tilt up; lower pitch means tilt down. Faster beeps mean you are closer to a good position. A chime and vibration mean your face fits inside the safe area. Keep still for a moment after each movement.',
  },

  framing: {
    states: {
      searching: 'Face not found. Slowly move the phone.',
      unavailable: 'Face guidance is unavailable. You can still record. Try reopening the camera.',
      good: 'Face in frame.',
      left: 'Move phone left.',
      right: 'Move phone right.',
      up: 'Tilt phone up.',
      down: 'Tilt phone down.',
      back: 'Move phone further away.',
      closer: 'Move phone closer.',
    },
    widening: 'Widening the shot.',
    zooming: 'Zooming in slightly.',
    debug: (fps: number, box: { x: number; y: number; width: number; height: number } | null) =>
      `Guidance ${Number(fps).toFixed(1)} updates/s. ${box && typeof box === 'object' ? `Box ${[box.x, box.y, box.width, box.height].map((v) => Number(v).toFixed(2)).join(', ')}` : 'No target'}`,
  },

  feedback: {
    on: 'Live feedback is on. Select Feedback mode before recording.',
    off: 'Live feedback is off. You can enable it in Settings.',
    poseUnavailable:
      'Posture guidance is unavailable in this build or on this phone. Head-facing and expression checks still work.',
    status: (value: FeedbackObservation, pose: string) => {
      if (!value || typeof value !== 'object') return 'Measuring live feedback.';
      const parts = [
        value.eyeContact === null
          ? 'Head direction not measured.'
          : value.eyeContact
            ? 'Head facing camera.'
            : 'Head turned away.',
        value.smiling === null
          ? 'Expression not measured.'
          : value.smiling
            ? 'Smile detected.'
            : 'Neutral expression.',
        pose === 'unavailable'
          ? 'Posture unavailable.'
          : value.posture === 'unknown'
            ? 'Posture not measured.'
            : value.posture === 'good'
              ? 'Posture looks upright.'
              : 'Posture needs adjustment.',
      ];
      return parts.join(' ');
    },
    cues: {
      lookAtCamera: 'Look at camera.',
      trySmiling: 'Try smiling.',
      sitUp: 'Sit up straight.',
      levelHead: 'Level your head slightly.',
    },
    summary: (value: FeedbackSummary) => {
      if (!value || typeof value !== 'object') return 'Feedback was not measured.';
      const measure = (name: string, percent: number | null, ms: number) =>
        percent === null
          ? `${name} not measured.`
          : `${name} ${percent} percent of ${Math.round(ms / 1000)} measured seconds.`;
      return [
        measure('Head facing camera', value.eyeContactPercent, value.eyeMeasuredMs),
        measure('Smiling', value.smilingPercent, value.expressionMeasuredMs),
        measure('Upright posture', value.goodPosturePercent, value.postureMeasuredMs),
      ].join(' ');
    },
    analyseVoice: {
      label: 'Voice analysis',
      hint: 'Measures the saved audio locally. Speaking pace needs on-device speech recognition.',
    },
    cancelVoice: {
      label: 'Cancel analysis',
      hint: 'Stops voice measurements and removes temporary audio',
    },
    voiceWorking: 'Measuring the saved audio on your phone. No second microphone is used.',
    voiceUnavailable:
      'Voice measurements failed. Your original video is kept. A new native build may be needed.',
    progress: (fraction: number) =>
      `Voice measurements ${Math.round(Number(fraction) * 100)} percent.`,
    voiceSummary: (value: VoiceSummary, detailed = false) => {
      if (!value || typeof value !== 'object') return 'Voice was not measured.';
      const level =
        value.quietPercent === null
          ? 'No measurable voice level.'
          : `Quiet in ${value.quietPercent} percent of measured audible samples.${value.quietPercent >= 30 ? ' Speak louder.' : ''}`;
      const pace =
        value.wordsPerMinute === null
          ? 'Speaking pace unavailable.'
          : `Speaking pace ${Math.round(value.wordsPerMinute)} words per minute. ${value.wordsPerMinute < 130 ? 'Speed up slightly.' : value.wordsPerMinute > 160 ? 'Slow down slightly.' : 'Pace in the target range.'}`;
      const pitch =
        value.monotone === null
          ? 'Not enough voiced audio for a tone variation estimate.'
          : detailed && value.monotone
            ? 'Limited pitch variation. Try varying your tone.'
            : `Pitch variation ${Number(value.pitchVariationSemitones).toFixed(1)} semitones.`;
      return `${level} ${pace} ${pitch}`;
    },
    voiceFallback:
      'Head direction, expression and posture guidance are live in Feedback mode. Voice measurements run on the saved recording from Review, preserving video sound. Speaking pace requires on-device recognition; recorded audio is never sent to a speech server.',
  },

  lighting: {
    states: {
      waiting: 'Measuring lighting. Hold still for a moment.',
      unavailable:
        'Lighting guidance is unavailable. You can still record. Try reopening the camera.',
      needsFace: 'Face not found. Only overall brightness is available.',
      dark: 'Lighting too dark. Move towards a light.',
      backlit: 'Light behind you. Turn to face the light.',
      shadowLeft: 'Shadow on the left side of your preview. Turn slightly right.',
      shadowRight: 'Shadow on the right side of your preview. Turn slightly left.',
      shadowTop: 'Shadow above your face. Adjust the light or lower your chin slightly.',
      shadowBottom: 'Shadow under your face. Tilt your head up slightly.',
      good: 'Lighting good.',
    },
    scan: { label: 'Light scan', hint: 'Searches for a brighter direction while you slowly turn' },
    cancelScan: { label: 'Cancel scan', hint: 'Stops the search for a brighter direction' },
    scanIdleOnly: 'Light scanning is available when the camera is ready and you are not recording.',
    motionExplain:
      'Lumi uses motion sensors to remember directions during a light scan. Your phone may now ask for motion access.',
    motionUnavailable:
      'Motion access is unavailable. You can allow Motion and Fitness in phone settings. Lighting checks still work.',
    scanInstructions:
      'Stay in one safe place. Slowly turn yourself and the phone in a full circle, keeping the phone upright. The scan stops after a minute and a half. You can cancel using the scan button.',
    scanning: (progress: number) =>
      `Scanning for light. ${Math.round(Number(progress) * 100)} percent covered.`,
    scanTurn: (direction: string, degrees: number) =>
      Number(degrees) <= 10
        ? 'Hold this direction for a moment.'
        : `Brighter area ${direction}. Turn about ${degrees} degrees.`,
    scanDone: 'Brighter direction reached. Hold still while lighting is checked again.',
    scanFailed:
      'No reliable brighter direction found. Keep the phone upright, move near a light, and try again.',
    debug: (overall: number, face: number | null) =>
      `Brightness ${Number(overall).toFixed(0)}. Face ${face === null ? 'not found' : Number(face).toFixed(0)}.`,
  },

  review: {
    title: 'Review',
    screenAnnouncement: 'Review',
    empty: 'No recording yet',
    summary: (duration: string) => `Video length ${duration}.`,
    nextSteps: 'The video is saved in Lumi. Choose Play, Retake, Save to Photos, or Share.',
    noAudio: 'This video has no recorded sound.',
    play: { label: 'Play', hint: 'Opens playback and voice analysis' },
    share: {
      label: 'Share',
      hint: 'Opens the system sheet to send this saved video to another app',
    },
    shareTitle: 'Share your Lumi recording',
    shareInfo:
      'Choose an installed app in the share sheet, then finish posting there. Available apps depend on your phone.',
    shareMissing:
      'This video file is no longer in Lumi. Check Photos for a saved copy, or choose Retake.',
    shareUnavailable: 'Sharing is unavailable on this phone. You can still save to Photos.',
    shareFailed: 'The share sheet did not open. Your video is still in Lumi. Try again.',
    busy: 'Please wait for the current action to finish.',
    measurements: (value?: RecordingSummary) => {
      const framing =
        value?.inFramePercent == null
          ? 'Framing was not measured.'
          : `Subject fully in frame ${value.inFramePercent}% of ${en.common.duration(value.framingMeasuredMs / 1000)} measured.`;
      const lighting =
        value?.goodLightingPercent == null
          ? 'Face lighting was not measured.'
          : `Lighting good ${value.goodLightingPercent}% of ${en.common.duration(value.lightingMeasuredMs / 1000)} measured.`;
      const tail =
        value && value.darkTailMs >= 1000
          ? ` Lighting was dark for the last ${en.common.duration(value.darkTailMs / 1000)} measured.`
          : '';
      return `${framing} ${lighting}${tail}`;
    },
    save: { label: 'Save', hint: 'Saves the video to your photos' },
    savedLabel: 'Saved',
    retake: {
      label: 'Retake',
      hint: 'Removes the app copy and returns to the camera. A saved Photos copy is kept.',
    },
    saving: 'Saving',
    saved: 'Saved to Photos',
    alreadySaved: 'Already saved to Photos',
    saveDenied:
      'Photo access is off, so Lumi cannot add this video to Photos. It is saved in Lumi and can be shared. To allow Photos, open your phone settings, find Lumi, and allow Photos.',
    saveFailed: 'Saving to Photos did not work. The video stays in Lumi. Please try again.',
    deleted: 'Video deleted',
  },

  playback: {
    title: 'Playback',
    screenAnnouncement:
      'Playback. Commands pause while the video plays. Use Pause to speak a command. Voice analysis is available here when enabled in Settings.',
    play: { label: 'Play', hint: 'Continues the video with its recorded sound' },
    pause: { label: 'Pause', hint: 'Pauses the video and enables spoken commands' },
    restart: { label: 'From beginning', hint: 'Restarts playback from the beginning' },
    position: (position: string, duration: string) => `${position} of ${duration}`,
    ended: 'Playback finished',
    failed: 'This video could not be played. Return to Review to save, share, or retake it.',
    analysisOff: 'Voice analysis needs a video with sound and Voice feedback enabled in Settings.',
    reviewOnly: 'Return to Review for saving, sharing, or a new recording.',
  },

  permissions: {
    title: 'App access',
    names: {
      camera: 'Camera',
      microphone: 'Microphone',
      speech: 'Spoken commands',
      photos: 'Add videos to Photos',
    },
    reasons: {
      camera:
        'Camera access lets Lumi show and record video and guide framing, lighting and background on your phone.',
      microphone:
        'Microphone access adds sound to your video and enables spoken commands. Without it, recordings are silent.',
      speech:
        'Speech access enables spoken commands and also needs Microphone access. Your phone may use Apple or Google services if local recognition is unavailable. Recorded-video voice analysis uses only local recognition.',
      photos:
        'Photos access lets Lumi automatically add finished videos to your photo library. Only permission to add is requested. Sharing the video saved in Lumi works without this access.',
    },
    status: {
      allowed: 'Allowed',
      off: 'Off',
      unknown: 'Checking access',
      unavailable: 'Access could not be checked',
    },
    item: (name: string, status: string) => `${name}: ${status}`,
    detailHint: 'Explains this access and lets you request it or open phone settings',
    allow: {
      label: 'Allow access',
      hint: 'Explains why this access is needed, then asks your phone for permission',
    },
    skip: {
      label: 'Skip this request',
      hint: 'Moves on without requesting or changing access. Existing phone permissions stay as they are.',
    },
    granted: 'Access allowed',
    failed:
      'Access could not be requested. You can continue and try again from Settings, More, App access.',
    speechRequiresMic:
      'Spoken commands need microphone access first. Allow Microphone or continue using buttons.',
    optional:
      'You can continue without allowing this. Buttons still work if spoken commands are off. Videos without microphone access have no sound. Photos access is optional for sharing a video saved in Lumi.',
    manageIntro:
      'Choose an access type to hear what it does. Your phone settings control the final permission. Lumi checks again when you return.',
    deniedInfo:
      'This access is off. You can request it here, or allow it in your phone settings. Continuing keeps your choice.',
    settingsFailed:
      'Phone settings could not be opened. Open them from your phone home screen and find Lumi.',
    photos: {
      explain:
        'Lumi automatically saves each finished video to your photos. Your phone will now ask for permission to add videos. If you decline, the video stays in Lumi and you can retry saving from Review.',
    },
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
    help: {
      camera:
        'On Camera you can say: start recording, stop recording when listening during filming is enabled, switch camera, focus on my face, check lighting, find light, cancel light scan, feedback on, feedback off, what is behind me, describe my background, cancel scene description, install detailed mode, use standard mode, use detailed mode, delete standard mode, delete detailed mode, or Lumi help.',
      review:
        'On Review you can say: play video, save video, retake video, post video to open the share sheet, analyse my voice, or Lumi help. Complete posting in the app you choose.',
      playback:
        'While paused you can say: play video, restart video, analyse my voice, or Lumi help. Use the Pause button while playing, and Cancel analysis while analysing. Return to Review to save, share, or retake.',
    },
    reviewOnly: 'Finish a recording, then use Review for playback, saving and sharing.',
    cameraOnly:
      'That command is available on another screen. Ask for help to hear commands for this screen.',
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
    framing: {
      label: 'Framing preferences',
      hint: 'Changes automatic lens switching and the size of the safe zone',
    },
    safeZone: {
      label: 'Safe zone',
      value: (percent: number) => `${percent}% of the frame`,
      help: 'A smaller safe zone leaves more room around your face. Choose between 60% and 90%. This does not change the saved video.',
    },
    privacy: { label: 'Privacy policy', hint: 'Opens the privacy policy in your browser' },
    about: { label: 'About Lumi', hint: 'Version and licences' },
    version: (v: string) => `Version ${v}`,
    versionHint: 'App version. Repeated activation opens hidden diagnostics for testing.',
    contact: (email: string) => `Contact: ${email}`,
    aboutBody:
      'Lumi analyses video on your phone. Video and images never leave your phone. To understand voice commands, your phone may use Apple or Google speech recognition. Posture uses Google MoveNet Lightning, licensed under Apache 2.0. The model is bundled and runs on your phone. Voice measurements use saved audio locally; speaking pace needs on-device recognition. Background detection uses TensorFlow COCO SSD MobileNet under Apache 2.0. Standard descriptions use SmolVLM2 under Apache 2.0. Detailed uses a community GGUF conversion and quantization of Google Gemma 3n by shreyashmakadia. Gemma is provided under and subject to the Gemma Terms of Use found at https://ai.google.dev/gemma/terms, including its prohibited use policy. Model downloads are optional. Google does not endorse Lumi.',
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
