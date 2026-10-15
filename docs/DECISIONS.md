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

| Brief | Replacement (v5) | Why |
|---|---|---|
| `react-native-worklets-core` | `react-native-vision-camera-worklets` + `react-native-worklets` | v5 does not use worklets-core |
| `vision-camera-resize-plugin` | `react-native-vision-camera-resizer` 5.2.3 | Official v5 plugin (Metal / Vulkan). Old plugin last released 2024, requires v4 |

v5 frame outputs also accept a `targetResolution`, so frames can be requested small at the source.

### D6. Face detection
`react-native-vision-camera-face-detector` 2.1.0 (ML Kit, classification, landmarks, contours)
supports VisionCamera v5. Confirmed compatible on paper; verified on device in Phase 2.

### D7. Pose detection: MoveNet Lightning on `react-native-fast-tflite` (proposed)
No maintained ML Kit pose plugin exists for VisionCamera v5. `react-native-vision-camera-mlkit`
lists pose as a future roadmap item; v4 pose plugins have not been updated since 2024. Proposal:
run Google's MoveNet SinglePose Lightning TFLite model (Apache 2.0, 17 body keypoints) through
`react-native-fast-tflite`, which Lumi already needs for object detection. One runtime, two models.
Final choice recorded in Phase 4.

### D8. Other packages (versions at project start)

| Area | Package | Version | Notes |
|---|---|---|---|
| Object detection runtime | `react-native-fast-tflite` | 3.0.1 | Nitro based, Android min SDK 26 |
| Scene description | `llama.rn` | 0.12.9 stable, 0.13.0-rc.7 | Compatibility with SmolVLM2 and Gemma 3n checked before Phase 5 |
| Tones and panning | `react-native-audio-api` | 0.13.6 | Needs `react-native-worklets` 0.7 or newer (SDK has 0.10.1) |
| Voice commands | `expo-speech-recognition` | 57.1.1 | |
| Volume buttons | `react-native-volume-manager` | 2.2.0 | |
| Settings storage | `react-native-mmkv` | 4.3.2 | Nitro based |

## Design and accessibility

### D9. Camera overlay opacity 0.8, not 0.6
`surfaceOverlay` backs text drawn over the live camera feed. Over a fully white frame (a white
wall, a bright window), `rgba(0,0,0,0.6)` gives white text only 5.7:1 and secondary text 3.4:1,
below the 7:1 rule. 0.8 gives 12.6:1 and 7.5:1. The contrast test checks this worst case.

### D10. Light mode tokens
The brief fixed only background, primary text and accent for light mode. Added:

| Token | Light value | Contrast on white / on surface |
|---|---|---|
| `surface` | `#F2F2F5` | |
| `textSecondary` | `#3C3C43` | 10.9:1 / 9.8:1 |
| `good` | `#05553C` | 8.9:1 / 7.9:1 |
| `adjust` | `#8A5A00` (same as accent) | 5.9:1 / 5.3:1 (icons and borders only) |
| `problem` | `#991B1B` | 8.3:1 / 7.4:1 |

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

## Defaults chosen (change in Settings or tell me to change the default)

| Setting | Default | Reason |
|---|---|---|
| Live feedback | Off | Fewer cues while a new user learns framing |
| Cues during recording | Earphones only | Cues on the loudspeaker would be recorded into the video |
| Camera | Front | Most users film themselves |
| Announce recording time | Every 30 seconds | From the brief |
| Voice commands while recording | Off | From the brief |
| Model downloads on mobile data | Off | From the brief |

## Later phases (to be filled in)

- Microphone sharing between recording and live voice analysis (Phase 4)
- Gemma licence notice and Gemma 3n vision support in `llama.rn` (Phase 5)
- Scene description benchmark results (Phase 5)

## v2 options

- Direct YouTube upload with the YouTube Data API. Needs Google OAuth app verification, so v1 uses
  the system share sheet, which already reaches YouTube, TikTok, Instagram and WhatsApp.
