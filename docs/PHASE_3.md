# Phase 3: lighting and light scan

Branch: `phase-3-lighting`. Implementation is ready for review; phone acceptance is pending. Do not merge until the owner confirms the phone tests in TESTING.md.

## Current phase assessment

Main contains merged PR #4 for Phase 2, at `575e2a4`. Face framing, face-only subject selection and conservative automatic zoom are implemented. Whole-body/object tracking was explicitly deferred in D31. Phase 2 phone validation is not recorded as passed. Phase 3 lighting/scan code was absent before this branch.

## Implemented

- The mode button offers Framing and Lighting only. Lighting mode adds a Light scan / Cancel scan button. Camera has at most six controls, as allowed by the original camera-screen exception; settings remain reachable through Subject setup.
- Voice commands “check lighting” and “find light” now select Lighting and check status / start a scan. The existing recording, camera, volume-button and voice protections remain in place.
- A camera worklet requests small YUV buffers and samples a 32 × 32 luminance grid every 500 ms. It respects row stride and video/full-range luminance. The camera already provides luminance in its Y plane; an RGB-to-luminance utility tests the brief's 0.299/0.587/0.114 coefficients. No full frames, pixels or motion readings are persisted or uploaded.
- Preview-to-camera and camera-to-frame native transforms align the sampled grid with the visible preview, including crop, rotation and mirroring. Face bounds are mapped through the inverse native preview transform. No guessed front-camera sign reversal is used.
- Lighting runs ML Kit face detection on the same sampled frame. Android CameraX cannot attach two independent ImageAnalysis use cases, so Lighting and Framing use mutually exclusive analysis outputs. Framing retains its existing 12 fps native detector. Lighting detects faces at 2 fps and holds the selected tracking ID instead of jumping immediately to a bystander.
- Pure lighting logic measures overall, face and background luminance plus left/right and top/bottom face halves. It detects darkness, backlight and asymmetric shadows. Missing or tiny faces never produce “Lighting good.” Sustained measurements settle for one second; stale/erroring samples invalidate old good states.
- Lighting cues use priority 2 in the existing cue queue, deduplication, rate limits, screen reader route and recording/earphone policy. A good cue is silent until the state changes. Switching modes clears old guidance.
- Scan explicitly checks motion availability and permission, explains any permission prompt, then asks the user to slowly turn in one safe place. Expo DeviceMotion supplies fused gyroscope attitude (relative yaw, not a compass or geographic bearing). Nothing subscribes to motion until a scan is requested.
- A scan bins brightness by relative direction, requires a near-full circle and light samples over at least 30 of 36 sectors, and averages repeat samples per sector. Rocking back and forth does not count as a circle. Uniform/dark scenes, sensor jumps, stalls and a 90-second timeout fail with an explanation instead of inventing a best direction.
- After a scan, shortest-turn speech and stereo tones guide back to the brighter sampled direction. Holding within ten degrees for 700 ms gives a chime/vibration. Scan stops on cancel, recording start, camera change, navigation or app background. Late permission callbacks cannot restart it.

## Calibration and limits

Thresholds live in `src/features/lighting/config.ts`. They are initial engineering values, not phone-calibrated results. Camera auto exposure changes pixel brightness as the scene changes; a brighter measured image is not a calibrated lux reading or a guarantee of better facial lighting. Always let ordinary face lighting settle again after the scan. Direction signs, drift, partial turns, portrait/landscape, camera buffer negotiation, exposure effects, battery and simultaneous recording all need phone checks on both platforms.

Adding expo-sensors and VisionCamera worklets requires a new native development build/APK. An old development client cannot load these native modules. Expo Go remains unsupported. No EAS account, paid service, cloud analysis or new API key is required.

## Validation

Automated validation covers synthetic darkness/backlight/shadows, luminance, cropped/no faces, invalid buffers, row padding, crop/mirror/rotation sampling, video-range expansion, scan wraparound/coverage/direction/timeout/cancel, frame disposal/throttling, motion denial and cancellation during permission/instruction awaits. Local validation passed: TypeScript, ESLint with no warnings, all 498 tests in 19 suites, Android/iOS JS and Hermes exports, and native project generation for both platforms. Motion permission text and Android autolinking were checked. Android/iOS compilation is left to the existing PR workflows because this Linux machine has no Android SDK or Xcode.

A passing mocked pipeline test is not evidence of camera or sensor behavior on a physical phone. Phase 3 meets its completion criterion only after the dark-room, backlit and side-lit phone tests pass.
