# Lumi technical decisions

Each entry: what was decided, why, and what it affects. Newest phase at the bottom of each section.
Package versions checked on 2026-10-15.

## Platform and toolchain

### D1. Expo SDK 57 (React Native 0.86.3, React 19.2.3)

Latest stable SDK at project start. New Architecture only (legacy architecture removed from React
Native). Expo Go cannot run Lumi; a development build is required (custom native modules).

### D2. Minimum iOS 16.4, not 16.0

`ExpoModulesCore` in SDK 57 declares iOS 16.4 as its minimum, so 16.0 cannot build. Every phone
that runs iOS 16 can update to 16.4 or later (iPhone 8 and newer), so the supported phone list is
the same. Set with the built-in `expo.ios.deploymentTarget` property, because the
`expo-build-properties` `ios.deploymentTarget` option is deprecated since SDK 56.
Android minimum is API 29 (Android 10), set with `expo-build-properties`.

### D3. Peer versions pinned to SDK 57

npm auto-installed newer optional peers of Expo Router (Reanimated 4.7, Worklets 0.13, react-dom
19.3) that do not match SDK 57. They are pinned to the SDK versions (Reanimated 4.5.1, Worklets
0.10.1, react-dom 19.2.3) because native modules autolink whatever is in `node_modules`.

### D4. React Native Testing Library 13, not 14

RNTL 14 made `render` async. Expo Router 57's `renderRouter` test helper still calls it
synchronously, so screen tests use RNTL 13 with `react-test-renderer` 19.2.3.

## Camera and machine learning stack (planned, confirmed per phase)

### D5. VisionCamera v5 replaces two packages named in the brief

`react-native-vision-camera` is now v5, a rewrite on Nitro Modules. Its frame processors run on
`react-native-worklets` (Software Mansion, already part of SDK 57) through
`react-native-vision-camera-worklets`. The brief's packages belong to v4:

| Brief                         | Replacement (v5)                                                | Why                                                                             |
| ----------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `react-native-worklets-core`  | `react-native-vision-camera-worklets` + `react-native-worklets` | v5 does not use worklets-core                                                   |
| `vision-camera-resize-plugin` | `react-native-vision-camera-resizer` 5.2.3                      | Official v5 plugin (Metal / Vulkan). Old plugin last released 2024, requires v4 |

v5 frame outputs also accept a `targetResolution`, so frames can be requested small at the source.

### D6. Face detection

`react-native-vision-camera-face-detector` 2.1.0 (ML Kit, classification, landmarks, contours)
supports VisionCamera v5. Confirmed compatible on paper; verified on device in Phase 2.

### D7. Pose detection: MoveNet Lightning on `react-native-fast-tflite` (approved 2026-10-15)

No maintained ML Kit pose plugin exists for VisionCamera v5. `react-native-vision-camera-mlkit`
lists pose as a future roadmap item; v4 pose plugins have not been updated since 2024. Proposal:
run Google's MoveNet SinglePose Lightning TFLite model (Apache 2.0, 17 body keypoints) through
`react-native-fast-tflite`, which Lumi already needs for object detection. One runtime, two models.
Approved by owner. Model file, licence and source are recorded here in Phase 4.

### D8. Other packages (versions at project start)

| Area                     | Package                    | Version                    | Notes                                                           |
| ------------------------ | -------------------------- | -------------------------- | --------------------------------------------------------------- |
| Object detection runtime | `react-native-fast-tflite` | 3.0.1                      | Nitro based, Android min SDK 26                                 |
| Scene description        | `llama.rn`                 | 0.12.9 stable, 0.13.0-rc.7 | Compatibility with SmolVLM2 and Gemma 3n checked before Phase 5 |
| Tones and panning        | `react-native-audio-api`   | 0.13.6                     | Needs `react-native-worklets` 0.7 or newer (SDK has 0.10.1)     |
| Voice commands           | `expo-speech-recognition`  | 57.1.1                     |                                                                 |
| Volume buttons           | Lumi module (D23)          | n/a                        | `react-native-volume-manager` removed in Phase 1, see D23       |
| Settings storage         | `react-native-mmkv`        | 4.3.2                      | Nitro based                                                     |

## Design and accessibility

### D9. Camera overlay opacity 0.8, not 0.6

`surfaceOverlay` backs text drawn over the live camera feed. Over a fully white frame (a white
wall, a bright window), `rgba(0,0,0,0.6)` gives white text only 5.7:1 and secondary text 3.4:1,
below the 7:1 rule. 0.8 gives 12.6:1 and 7.5:1. The contrast test checks this worst case.

### D10. Light mode tokens

The brief fixed only background, primary text and accent for light mode. Added:

| Token           | Light value                | Contrast on white / on surface         |
| --------------- | -------------------------- | -------------------------------------- |
| `surface`       | `#F2F2F5`                  |                                        |
| `textSecondary` | `#3C3C43`                  | 10.9:1 / 9.8:1                         |
| `good`          | `#05553C`                  | 8.9:1 / 7.9:1                          |
| `adjust`        | `#8A5A00` (same as accent) | 5.9:1 / 5.3:1 (icons and borders only) |
| `problem`       | `#991B1B`                  | 8.3:1 / 7.4:1                          |

Light accent `#8A5A00` is 5.9:1 on white, so it is never used for text. No text colour reaches 7:1
on an `#8A5A00` fill either, so light mode primary buttons use a surface fill with an accent border.
Status colours are only used for borders and icons; status words always use primary text.

### D11. "Max 4 controls per screen"

Applied to every screen except the camera, whose 6 zones are defined in the brief. The Back button
is not counted. Settings are therefore split into 4 groups (Sound and speech, Live feedback,
Camera and recording, More) with at most 4 controls each. An automated test renders every screen
and fails if this rule, or label / role / hint on any control, is broken.

### D12. Custom header with 60 pt Back button

Native stack headers draw a back button smaller than 60 pt, so headers are hidden and each screen
uses `ScreenHeader` with a 60 pt Back button in the top left corner.

### D13. Routes

`app/settings/` is a folder (one file per settings group) instead of a single `settings.tsx`.
Onboarding lives at `/welcome` inside the `(onboarding)` group.

### D14. Orientation

Portrait and landscape are allowed app wide (needed for the camera). If testers find rotation of
the other screens disorienting, they can be locked to portrait with `expo-screen-orientation`.

### D15. Multi-value settings use the "adjustable" role

VoiceOver users swipe up or down to change verbosity, cue type, voice speed and similar settings,
and double tap steps forward. On/off settings use the "switch" role.

## Privacy

### D16. Android backup off

`android:allowBackup="false"` so settings and recording stats never leave the phone through
Google backup. Users lose settings when moving to a new phone; acceptable for v1.

### D17. iOS backup exclusion for model files (Phase 5)

Apple's storage guidelines reject apps that let large re-downloadable files go into iCloud backup.
Model files will be stored in the app's documents area and marked "exclude from backup".

### D18. Export compliance

`ITSAppUsesNonExemptEncryption = false`: Lumi only uses the operating system's HTTPS to download
model files, which is exempt. This skips the export compliance question on every TestFlight build.

### D19. Speech recognition: on device first, Apple / Google servers as fallback

Owner decision (2026-10-15), replacing the brief's "no audio leaves the phone" rule for speech
only: working voice features on every phone matter more than keeping speech on the phone.

- Lumi asks for on device recognition whenever the phone supports it (`supportsOnDeviceRecognition`).
  On device is faster, works offline and has no time limit.
- Otherwise the phone's own speech service may send audio to Apple (iPhone) or Google (Android)
  servers and returns text. Lumi never receives or stores that audio.
- Cost: none. Both services are free system features with no API key or billing. Apple limits
  server recognition per device and per app per day, and to about 1 minute of audio per request,
  so long recordings restart recognition before each minute ends (pace feedback, Phase 4).
- Android 13+ phones can download an offline English pack (`androidTriggerOfflineModelDownload`);
  Lumi will offer it once during onboarding (Phase 7) so those phones stay on device. A system
  dialog popping up on the camera screen would be disorienting, so Phase 1 does not trigger it.
- iPhone needs the speech recognition permission (server mode). Android only needs microphone.
- Video, images and camera analysis still never leave the phone.
- Privacy policy and store listing updated. Store privacy answers get a final check in Phase 8:
  App Store "Data Not Collected" should still hold because Lumi itself never receives the audio;
  Google Play's form may need "voice recordings, processed ephemerally".

## Phase 1: cues, camera, recording

### D23. Volume button: Lumi's own native module instead of `react-native-volume-manager`

`modules/lumi-hardware-buttons` (Expo local module, Swift + Kotlin). The library in the brief was
removed because:

1. On iOS its volume listener switches the shared audio session to "ambient", which cannot record,
   so it would break video sound and voice commands.
2. It detects presses through volume changes, so presses do nothing at maximum or minimum volume,
   and every press changes the user's volume.
3. App Store guideline 2.5.9 rejects apps that alter the behaviour of the volume buttons through
   workarounds. Apple's approved way for camera apps is `AVCaptureEventInteraction` (iOS 17.2+):
   the volume does not change, no volume overlay appears, and it also supports the Camera Control
   button on newer iPhones.

iPhones on iOS 16.4 to 17.1 (iPhone 8 / X that cannot update) have no volume button control; the
record button and voice commands still work, and the record button hint stops mentioning volume.
Android wraps the activity's key handling while the camera screen is open, consumes volume key
presses (volume unchanged) and reports one press per release.

### D24. Microphone attached to the camera only while recording

VisionCamera holds the microphone whenever its video output has audio enabled, which would block
speech recognition, and "start recording" must be heard before recording starts. So Lumi enables
audio on the video output when recording starts and removes it when recording stops. Starting
therefore takes about half a second to a second; the start earcon plays only once recording has
really started. Voice commands pause during recording by default (brief 7.7); the setting "Voice
commands while recording" keeps them on, which may or may not work alongside camera audio on a
given phone (to test).

### D25. One iOS audio session for everything

`playAndRecord` category, `videoRecording` mode, options `defaultToSpeaker` (loudspeaker instead
of the quiet earpiece), `allowBluetoothA2DP` (Bluetooth earphones play cues while the phone's own
microphone records, instead of switching to the low quality call microphone) and `duckOthers`.
VisionCamera's capture session reconfigures the shared session when it adds audio, so Lumi
re-applies its setup after every camera configuration and after recording starts. Speech
recognition is started with the same category. Haptics during recording are allowed
(`allowHapticsAndSystemSoundsPlayback`); a faint buzz may be audible in recordings (to test).

### D26. Photos permissions

- iOS: add-only access (`NSPhotoLibraryAddUsageDescription`); Lumi never reads the photo library.
- Android: all `READ_MEDIA_*`, `READ_EXTERNAL_STORAGE` and `ACCESS_MEDIA_LOCATION` permissions are
  blocked. Google Play restricts apps that request photo / video read access without needing it.
  Android 10 to 12 still need `WRITE_EXTERNAL_STORAGE` (declared with `maxSdkVersion` 32) for
  `expo-media-library` to save; Android 13+ needs no permission to add a video.
- Saving uses `expo-media-library/legacy` `saveToLibraryAsync`, which works with add-only access.

### D27. Audio library configuration

`react-native-audio-api` config plugin with background audio and the Android foreground service
turned off (its defaults turn them on, and App Store review rejects unexplained background audio),
and FFmpeg turned off (smaller app; Lumi only synthesises tones).

### D28. Voice commands

- Phrases from brief 7.7 plus a few natural variants, always at least 2 words ("save video", not
  "save"), because VoiceOver / TalkBack read button labels out loud and the microphone could hear
  them. A test fails if any label, hint or message in `en.ts` contains a command phrase.
- The recognizer is paused while Lumi speaks and its results are ignored while a screen reader
  announcement is estimated to be playing, so Lumi never obeys itself.
- Phase 1 handles start / stop recording, switch camera, save video, retake video and help. Other
  commands are recognised and answered with "That command comes in a later update".

### D29. Screen reader adaptation

When VoiceOver / TalkBack is on, cue words are sent as screen reader announcements instead of
Lumi's own speech, so two voices never talk over each other and the user's screen reader voice
and speed are used. Cues that only repeat what the screen reader already says are skipped.

### D30. Review in Phase 1

Recordings move from the camera's temporary folder into Lumi's documents folder. Review offers
Save (to Photos, asks for add-only access the first time) and Retake (deletes Lumi's copy). Play,
Share and statistics arrive in Phase 6.

## Defaults chosen (change in Settings or tell me to change the default)

| Setting                        | Default                             | Reason                                                            |
| ------------------------------ | ----------------------------------- | ----------------------------------------------------------------- |
| Live feedback                  | Off (confirmed by owner 2026-10-15) | Fewer cues while a new user learns framing; turned on in Settings |
| Cues during recording          | Earphones only                      | Cues on the loudspeaker would be recorded into the video          |
| Camera                         | Front                               | Most users film themselves                                        |
| Announce recording time        | Every 30 seconds                    | From the brief                                                    |
| Voice commands while recording | Off                                 | From the brief                                                    |
| Model downloads on mobile data | Off                                 | From the brief                                                    |

## Devices and workflow

### D20. iPhone and iPad, iPad full screen only (owner decision 2026-10-15)

`supportsTablet: true` and `requireFullScreen: true`. iPadOS restricts camera access when an app
shares the screen in Split View or Slide Over, so Lumi opts out of iPad multitasking and always
runs full screen. Layouts use flexbox and corner anchoring, so they scale to iPad sizes. App Store
needs iPad screenshots too (13 inch iPad), see STORE_LISTING.md.

### D21. One branch and one pull request per phase

Branch names `phase-N-short-name`, created from `main`. If the previous phase is still in review,
the next phase branches from it and its pull request targets `main` once the previous one merges.
Merging a pull request into `main` publishes a new Android test APK automatically.

### D22. Contact

Support and privacy contact: projectvanguard.sg@gmail.com. Privacy policy URL is a placeholder
(the public GitHub copy of docs/PRIVACY.md) until the owner's domain is ready.

## Later phases (to be filled in)

- Production builds still contain the development client, which adds a local network permission
  text to iOS. Check and exclude it in Phase 8.

- Microphone sharing between recording and live voice analysis (Phase 4)
- Gemma licence notice and Gemma 3n vision support in `llama.rn` (Phase 5)
- Scene description benchmark results (Phase 5)

## v2 options

- Direct YouTube upload with the YouTube Data API. Needs Google OAuth app verification, so v1 uses
  the system share sheet, which already reaches YouTube, TikTok, Instagram and WhatsApp.

### D31. Phase 2 is face-first

Whole-body and object tracking are deferred. Subject setup offers only working face detection. Camera has four controls; settings moved into subject setup. See PHASE_2.md for detector, coordinate and zoom decisions.

### D32. Automatic Photos saving

Every completed recording attempts an add-only Photos save. Denial/failure preserves the local recording for Review retry. Retake does not delete a saved Photos copy.

### D33. Phase 2 validation and merge

Use a separate phase branch and PR APK artifact. Keep the PR unmerged until the owner confirms phone tests. ML Kit iOS compilation uses an unsigned device target, since arm64 simulator binaries are unavailable upstream.

## Phase 3: lighting

### D34. One camera analysis output per mode

Lighting uses `react-native-vision-camera-worklets` 5.2.3 with the existing Worklets runtime. Its 2 Hz processor samples the camera's Y plane and detects faces from that same frame. Framing keeps the existing native detector. They are never attached together: Android CameraX supports only one ImageAnalysis use case. No additional resize plugin is needed for a CPU luminance grid: native preview-sized YUV buffers plus fixed-grid sampling avoid copying full RGB frames to JavaScript. Native converters align both face bounds and sampled pixels to preview coordinates.

### D35. Relative motion scanning and honest brightness limits

`expo-sensors` (SDK 57) supplies fused gyroscope attitude only while the user requests a scan. iOS motion permission is explained before prompting. Relative yaw is sufficient for returning to a sampled direction; no location or compass permission is requested. Pixel luminance is affected by automatic exposure, so a scan suggests a brighter sampled direction and face lighting is checked again afterward. It does not claim a lux measurement. Coverage, contrast, sensor freshness and timeout checks prevent unsupported success claims. Initial thresholds require phone calibration.

### D36. Camera guidance modes and controls

Phase 3 exposes only implemented Framing and Lighting modes, plus an explicit light-scan toggle in Lighting. This uses the original camera exception of at most six controls; other screens keep the four-control limit. Changing to Lighting replaces the framing analysis output and pauses automatic zoom, keeping scan scale stable. Lighting cues retain the shared cue engine and recording audio settings. See PHASE_3.md and TESTING.md for implementation limits and acceptance checks.

## Phase 4: feedback

### D37. Separate Feedback camera mode, same-frame face and pose analysis

Feedback is an explicit third camera mode at 5 Hz, with one analysis output, independent type toggles and the existing off-by-default master switch. ML Kit landmarks/classification supply the head-facing and smile estimates. The approved D7 MoveNet Lightning model is bundled (source, licence and checksum in assets/models and PHASE_4.md) and runs through fast-tflite 3.0.1 with the v5.2.3 GPU resizer. Aspect-preserving padding and native camera conversion tie the pose to the tracked face. Low confidence and unsupported GPU/model paths are reported as unavailable. Head-facing and 2D posture are estimates requiring calibration; do not claim measured gaze or medical posture accuracy.

### D38. Protect video audio with post-recording voice measurements

The brief permits post-recording voice analysis when microphone sharing is unreliable. This cloud session cannot verify sharing on physical iOS/Android phones. The recommended fallback was chosen while an optional preference question remained unanswered: no independent microphone recorder runs beside video capture. Review offers local audio extraction and RMS/pitch measurements; pace additionally needs on-device file recognition (Android 13+). Recorded clips never use server speech recognition. Existing D19 system-service fallback for live commands is unchanged. Independent pitch advice remains Detailed-only. Document and test missing metrics instead of inventing values. Experimental live voice capture can be a separate device-validated change.

### D39. Feedback history and speech ownership

Only aggregates for the latest 20 recordings persist in MMKV. No frames, raw landmarks, PCM, transcript or individual voice pitch samples are retained. Temporary WAV chunks are cleaned after analysis/cancel/failure. A recognizer lease prevents file transcripts from being interpreted as commands. Retake removes the app recording and its history entry, preserving any Photos copy.

## Phase 5: background recognition

### D40. One shared Framing/Background analysis stream

Background detection is bundled COCO SSD MobileNet, Apache 2.0, through the existing fast-tflite runtime. Framing's face detector now runs inside the same frame output at 12 Hz, with object inference at 1 Hz; Lighting and Feedback replace that output as before. This preserves Android's single ImageAnalysis constraint while allowing priority 3 warnings during Framing. Two observations establish a stable object, with a 2.5-second expiry. COCO has no window/bookshelf category, so backlight is described as a bright area, possibly a window. See PHASE_5.md for provenance, evidence and phone calibration requirements.

### D41. Runtime support is distinct from a validated downloadable model

Checked npm latest `llama.rn@0.13.0-rc.8` and its published source on 23 October 2026. The package contains Gemma 3n vision encoder code, but its example Gemma catalogue has no projector. Hugging Face remains blocked by the cloud environment proxy; the saved network draft needs review/publishing. Therefore no current Hugging Face pair or Gemma phone inference is claimed verified. Downloads resolve hashed pairs from the configured publisher, pin both files to one revision, and validate native vision support before installation. Text-only Gemma files cannot enable Detailed. A missing pair keeps Standard; SmolVLM2 2.2B is the proposed supported alternative, pending the owner's decision if Gemma vision cannot be validated. Do not silently substitute it.

### D42. Optional downloads, licences and memory limits

Standard is SmolVLM2 500M (Apache 2.0); optional Detailed requests Gemma 3n E2B. Gemma is provided under and subject to the Gemma Terms of Use found at https://ai.google.dev/gemma/terms, including the prohibited use policy at https://ai.google.dev/gemma/prohibited_use_policy. The same required notice is in About and model installation information. No Gemma weights are distributed in the repository. The user reviews terms before explicitly confirming a download; Google does not endorse Lumi. Combined sizes come from validated publisher metadata. Wi-Fi default, 20-percent progress announcements, cancellation, native streaming SHA-256 and iOS backup exclusion apply to both files. Gates require 3/8 GiB RAM for Standard/Detailed and a 1 GiB storage reserve; unsupported phones keep the bundled list. Local requests release context memory afterward. No paid/cloud AI is used.

### D43. Scene benchmark observations

The hidden phone benchmark records the exact revision, device/OS, total and component timings, and output for each installed model using the same gallery photograph. Only the latest 20 result records persist locally, with an explicit Clear action; photos are never retained in results. Gallery originals remain untouched.

| Model                  | Physical phone tested          | Time and quality result                           |
| ---------------------- | ------------------------------ | ------------------------------------------------- |
| Standard SmolVLM2 500M | None in this cloud environment | Not measured; five-second target unverified       |
| Detailed Gemma 3n E2B  | None in this cloud environment | Downloadable vision pair and inference unverified |

Native model-source inspection and a real CPU COCO detector smoke check are documented in PHASE_5.md. They are not substitutes for these phone results. Populate this table from the hidden screen before Phase 5 acceptance.
