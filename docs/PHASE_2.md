# Phase 2: face framing

Branch: `phase-2-framing`. Leave the PR unmerged until Mike confirms the phone tests pass.

## Implemented scope

- Face-only subject selection, plus the multiword camera command `focus on my face`.
- ML Kit face detection on device; no frames or face data uploaded or persisted.
- The largest face is selected initially, then its tracking ID is held. Without an ID, spatial proximity is used. A missing target is released after one second.
- Bounding boxes pass through VisionCamera's native camera-to-preview converter at all four corners. Rotation, mirroring and cover crop are handled there; boxes remain unclamped to preserve evidence of edge crossings.
- Whole-box safe area of 80%, a small exit tolerance, smoothing and 250 ms state settling. We say the face fits, rather than claim exact eye contact or full head visibility.
- Phone movement directions account for the mirrored front preview. Higher pitch means up, lower means down, stereo means physical phone movement direction. Faster beeps mean nearer the centre.
- Cues use the shared audio lock and recording/earphone policy. Good framing gets one chime and vibration per state transition. No repeated congratulatory speech.
- Native inference gated to at most 12 fps before ML Kit, using a guarded postinstall adjustment to detector 2.1.0. Preview-sized buffers and native backpressure keep heavy work away from the JS preview loop. Actual device throughput must be measured.
- Automatic zoom uses small steps after 1.2 seconds of sustained size error, with a three-second cooldown and a conservative cap. It uses the active controller's true limits and never changes devices or zoom during recording. Virtual devices may switch physical lenses within their zoom range; hardware without a wider range receives movement instructions. No unsupported physical ultra-wide lens is promised.
- Camera has four controls: flip, status, record and subject/setup. Settings are reachable from subject setup. Later guidance modes are not exposed as working features.
- Finished recordings are automatically saved with add-only photo access. Denial or failure retains Lumi's local copy and lets Review retry. Retake removes only Lumi's copy; the saved Photos copy remains.

## Compatibility evidence

Checked upstream tagged sources, rather than using VisionCamera v4 examples:

- [Face detector v2.1.0](https://github.com/luicfrr/react-native-vision-camera-face-detector/tree/v2.1.0): native output, preview resolution, `autoMode`, bounds and tracking ID.
- [VisionCamera v5.2.3](https://github.com/margelo/react-native-vision-camera/tree/v5.2.3): `CameraRef`, native preview conversion, controller zoom limits and displayable zoom factor.

The upstream detector hook recreates outputs when the options object changes. Lumi memoizes the native factory output per facing instead, to avoid reconfiguring on every guidance update.

ML Kit lacks an arm64 iOS simulator binary. CI therefore compiles an unsigned physical-device target, with no paid account or signing credentials. This is a compile check, not an installable iPhone test build.

## Validation and limits

Local DNS cannot reach GitHub or npm from this workspace. Sources were retrieved through the connected GitHub account. Dependency-free Node smoke checks pass. The PR runs the authoritative TypeScript, ESLint, Jest, Metro, Android and iOS compile checks. Check their latest results before treating this branch as test-ready.

The detector dependency is pinned. The lock entry is based on upstream package metadata; npm CI must validate registry availability. No integrity hash was fabricated. Refresh with npm when dependencies are available.

Orientation correctness, perceived directions, haptic support, actual lens transitions, preview performance, audio routing and automatic Photos saving still need phones. No claim of production readiness or store approval is made by these checks.

Full-body/object tracking, lighting, feedback, background description and sharing are later work.
