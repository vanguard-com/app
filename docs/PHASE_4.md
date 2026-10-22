# Phase 4: live feedback and recorded voice measurements

Branch: `phase-4-live-feedback`, based on Phase 3 merge `1aeb36f`. Native CI and physical-device acceptance are required before merge. No phone acceptance result is claimed for Phase 3 or Phase 4.

## Behavior

- Camera's mode control cycles Framing → Lighting → Feedback. Only one analysis output is attached at a time, preserving Android CameraX compatibility. Feedback mode processes preview-sized frames at 5 Hz. A native rebuild is required for the new TFLite, resizer, crypto and audio extraction modules; Expo Go is unsupported.
- Live feedback remains off by default. Settings has the master switch and separate head-facing/eye-contact, expression, posture and voice toggles. The existing labels are retained; the UI and review describe eye contact as an estimated head-facing percentage, not measured gaze. The voice commands “feedback on/off” activate or stop feedback; switching into Feedback mode is refused during a recording to preserve video capture.
- ML Kit supplies head angles, eye landmarks and smile probability. Visible eyes and valid measurements are required. A look-away must persist for three seconds before the cue. Neutral expression prompts occur only after 15 seconds and only in Detailed verbosity. Unknown/stale frames and target changes reset dwell timers.
- MoveNet SinglePose Lightning runs on-device through `react-native-fast-tflite` 3.0.1. The official VisionCamera resizer 5.2.3 produces letterboxed 192 × 192 RGB uint8 input, preserving proportions and accounting for rotation/mirroring. Its inverse maps the pose nose back to camera/preview coordinates; posture is used only when it matches the selected face, avoiding guidance about a bystander. Confident shoulder/head/hip landmarks estimate slouching and head tilt. These are frontal-view heuristics and need phone calibration, not medical or ergonomic measurements.
- Posture problems must persist for three seconds. Missing/low-confidence landmarks produce unknown, not good posture. A model/GPU failure disables posture while keeping face feedback and recording usable. Native and resized frames are released on success, dropped frames and errors.
- Cues use the existing priority-4 queue and recording/earphone policy. Persistent issues each get a turn, with local repeat suppression; stale guidance clears when the condition changes. Disabling the master or a type stops its measurements/cues.
- Review displays and speaks measured head-facing, smile and upright-posture percentages with measured durations. Unknown or disabled data is excluded rather than counted as success/failure. Aggregates for the latest 20 recordings persist locally in MMKV. Retake removes that recording's history entry. No raw face/pose data or transcripts are stored.

## Voice fallback and privacy

Simultaneous video microphone capture, independent pitch capture and speech recognition cannot be verified on phones from this cloud environment. To preserve recorded sound, this implementation uses the brief's fallback approach: the Review **Voice analysis** button measures the saved audio after capture; it never opens a second microphone. The user was offered live experimental capture versus this fallback; the recommended fallback was used while that preference remained unanswered. Do not describe microphone sharing as verified or voice feedback as live during filming.

The local Expo module uses AVAssetReader on iOS and MediaExtractor/MediaCodec on Android, producing temporary mono 16 kHz PCM WAV chunks of at most 30 seconds. JavaScript reads one chunk at a time to estimate RMS dBFS, quiet audible samples and pitch via normalized autocorrelation. Monotone assessment requires a full 20-second window with enough voiced samples; advice to vary tone is Detailed-only. Numbers are relative digital levels, not calibrated sound pressure or a clinical voice assessment.

Pace uses **only on-device** speech recognition of the temporary audio. There is no server fallback for recorded clips. Offline recognition must be available with the required permission/language pack; Android file input needs Android 13+. Older Android phones or unsupported recognizers still get loudness/pitch measurements, with pace explicitly unavailable. Partial transcripts replace earlier hypotheses and are discarded after calculating pace. Recognition failure never becomes a zero-word estimate. A recognizer lease pauses live commands and ignores file transcripts as commands, so a recorded “retake video” cannot delete a recording. During file recognition, live microphone commands are paused; use the accessible Cancel analysis button to stop. The recognizer lease is retained until native file recognition stops, including after cancellation. Cancel, navigation, app background and toggles abort analysis and clean up temporary audio; the original video remains untouched.

These platform limitations mean not every voice metric is available on every supported phone. The mobile extraction/recognition path needs native compilation and phone verification. No new service, account, API key or billing is required.

## Model provenance and reproducibility

- Official Google distribution: `https://www.kaggle.com/api/v1/models/google/movenet/tfLite/singlepose-lightning-tflite-int8/1/download`.
- Bundled model: `assets/models/movenet-lightning.tflite`, 2,894,840 bytes, Apache 2.0. Licence text is included alongside it and acknowledged in About.
- SHA-256: `cd7cc22fa946e5d146a7b98d496853e1923e22828d3972d579973f27f91bb105`.
- `node scripts/install-pose-model.cjs` refreshes the exact official version over verified HTTPS and rejects checksum changes against the saved metadata. The model is committed; users do not download it at runtime. Initial legacy Storage URLs rejected access; the official Kaggle endpoint succeeded.
- The actual bundled model allocated and ran with Google's `ai-edge-litert` 2.3.0 CPU interpreter: uint8 `[1,192,192,3]` input, float32 `[1,1,17,3]` output, finite keypoints with valid confidence values. Blank input validates the artifact/tensor contract, not human pose accuracy or mobile GPU behavior.

## Required acceptance

Run the Phase 4 checklist in TESTING.md on Android and iPhone. In particular verify native compilation, resizer support, head angle/orientation consistency, posture association, independent toggles/cues, saved audio quality, local voice extraction/recognition, cancellation/cleanup, screen reader behavior, and two-minute preview performance. Phase 4 is implemented and locally validated only when the current branch's automated checks pass; it is accepted only after those phone checks pass.

## Local verification results

TypeScript and ESLint passed, with 560 tests passing in 28 suites. Android and iOS native projects generated successfully, and the new Expo/React Native modules resolved in autolinking. Both mobile JavaScript/Hermes bundles exported with the bundled model. The official model installer reproduced the recorded checksum. Native compilation and phone behavior are separate checks; consult this phase PR for CI and use TESTING.md for acceptance.
