# Lumi store listing

Release copy for the current face-first v1. Text is prepared; publication and store acceptance
are pending the [Phase 8 release checklist](PHASE_8.md). Do not publish accessibility acceptance
badges until the physical VoiceOver/TalkBack journeys pass.

## Metadata

| Field                         | Limit | Copy                                                                |
| ----------------------------- | ----- | ------------------------------------------------------------------- |
| App name                      | 30    | Lumi                                                                |
| iOS subtitle                  | 30    | Film with sound and guidance                                        |
| Google Play short description | 80    | Audio and haptic camera guidance for blind and low vision creators. |
| Primary category              |       | Photo & Video (Apple); Photography (Play)                           |
| Language                      |       | English (v1)                                                        |
| Support contact               |       | projectvanguard.sg@gmail.com                                        |

### iOS keywords (100 characters total)

```text
blind,low vision,voiceover,talkback,accessible,camera,video,vlog,selfie,framing,lighting,creator
```

### Full description (both stores)

Lumi helps blind and low vision creators film themselves with spoken guidance, directional
tones and vibration.

FRAME YOUR FACE
Hear which way to move your phone. A chime and vibration confirm good framing. Lumi warns
when your face is cut off and can adjust zoom on supported cameras. Current framing follows
a face; whole-body and object framing are not available in this version.

CHECK YOUR LIGHT
Hear when the image is too dark, light is behind you or one side of your face is in shadow.
An optional light scan uses relative motion and camera brightness to suggest a brighter
direction. These are camera estimates, not a light meter.

CHOOSE FEEDBACK
Optional Feedback mode estimates head direction, smiles and posture. After recording, local
voice analysis can measure loudness and pitch; speaking pace needs supported on-device
recognition. Each feedback type can be turned off. Lumi does not measure true eye gaze or
provide medical advice.

HEAR YOUR BACKGROUND
Get a list of common objects. Optional on-device scene descriptions need a model download:
Standard about 546 MB, Detailed about 3.91 GB on supported phones. You review the size and
licence before downloading. Descriptions can be wrong; important details may be missed.

RECORD, REVIEW AND SHARE
Record with a large button, supported volume keys or spoken commands. Commands pause during
filming by default. Hear a summary with measured coverage, play your video, save to Photos or
choose another app in the system share sheet. Finish posting in the app you choose.

LEARN BY LISTENING
Spoken lessons, safe practice, scalable text, high-contrast controls, reduced-motion navigation
and labelled actions support use with VoiceOver and TalkBack. Camera guidance uses sound and
vibration as well as visible status.

YOUR MEDIA
Camera analysis and scene models run on your phone. Lumi has no account, ads or cloud AI.
Google ML Kit can send SDK diagnostics and usage metrics to Google. Live spoken commands may
use Apple or your Android speech provider when local recognition is unavailable. Optional
model downloads contact Hugging Face. Sharing or photo-cloud sync can send your video to a
service you choose. Read the privacy policy for details.

Requires iOS 16.4 or later, or Android 10 or later on a 64-bit ARM phone. iPhone volume capture
requires iOS 17.2 or later. Scene models have additional memory/storage requirements. Features
vary with camera hardware and system speech support. Lumi is a filming aid, not a navigation
or safety tool.

## Accessibility description and screenshot captions

Features implemented: VoiceOver/TalkBack labels, hints and heading focus; 60-point minimum
targets; scalable system text; screen-reader-aware speech, tones and haptics; a responsive
camera layout; Reduce Motion; visible focus; high-contrast themes; statuses distinguished
by text/border/icon as well as color. Settings screens have at most four actions besides Back;
Camera can have six. Actual reader, text-size, orientation and hardware-key acceptance remains
in [ACCESSIBILITY_AUDIT.md](ACCESSIBILITY_AUDIT.md).

Capture real release-build screenshots after phone acceptance. Avoid promises of unverified
latency, perfect recognition or independent accessibility certification.

1. Follow tones to frame your face.
2. Hear lighting estimates before filming.
3. Choose optional feedback.
4. Listen to a background description on your phone.
5. Hear the recording summary and review your video.
6. Share your saved video with another app.

Use a consented face and non-private background; remove notification banners and personal
data. Camera examples must match the current face-only controls and actual model output.
Do not replace app screenshots with concept art.

| Destination                 | Assets to capture/export                                                       |
| --------------------------- | ------------------------------------------------------------------------------ |
| Apple iPhone 6.9-inch       | Portrait 1320 × 2868 (landscape 2868 × 1320), real current UI                  |
| Apple iPad 13-inch          | Portrait 2064 × 2752 (landscape 2752 × 2064), since tablets are enabled        |
| Google Play phone           | At least two screenshots, 16:9 or 9:16 recommended; 1080 × 1920 portrait works |
| Google Play feature graphic | 1024 × 500, PNG/JPEG, no alpha; branding and truthful copy                     |
| Google Play store icon      | 512 × 512 opaque PNG exported from `assets/icon.png`                           |
| Apple app icon              | Existing 1024 × 1024 opaque icon, supplied through the binary                  |

Confirm current accepted device sizes in the store console at upload; requirements can change.
See [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
and [Google Play graphic assets](https://support.google.com/googleplay/android-developer/answer/9866151).
Screenshots and the feature graphic have not been fabricated in this cloud environment.

## App review / tester notes

No login, account, purchase or special test credentials. Use a physical phone with a face
visible to the front camera. In Welcome choose Learn controls, or Use camera now. Guided setup
explains each access type; Allow is optional. Complete safe practice to reach Camera.

Use Record to start/stop. Directional tones are easiest with earphones. During recording,
guidance defaults to earphones only and command listening pauses. At large text sizes or in
landscape, scroll the camera actions. Mode switches Framing/Lighting/Feedback/Background.
Subject opens Settings. Face-only framing is intentional; disabled body/object targets are
not required to test this release.

- Camera: preview, recording and local analysis. No camera image upload.
- Microphone: recording sound and live commands. Voice measurements use the saved clip.
- Speech: local-first live commands; Apple/Android service fallback is disclosed. Saved-video
  pace analysis requires local recognition and never uses that fallback.
- Photos: add-only saving, not broad library reading. Share still works after denial.
- Motion: requested only for relative light scan.
- Network: optional HTTPS model downloads, system speech fallback and vendor SDK diagnostics.
  Core camera, bundled face/object/posture analysis and recording work without a model download.

Review offers Play, Retake, Save and Share. Play opens playback; pause to use optional Voice
analysis. Save retries Photos. Share opens the native sheet; another app controls posting.
Optional scene models are large and not needed to test recording. Settings > More > Models
explains the sizes, requirements and licences, including Gemma's terms. Never infer a successful
post from the share sheet closing.

## Store privacy, URLs and rating

Use [STORE_PRIVACY.md](STORE_PRIVACY.md), not the original brief's “No data collected” answer.
Google's current ML Kit disclosure includes SDK metrics and per-installation identifiers.
Live speech and model-host logs also require review. The owner approved retaining ML Kit with disclosures on 24 October 2026. Final forms still
require provider review; no privacy forms have been submitted.

Owner decision, 24 October 2026: use the existing public GitHub policy until the website is ready.
Use these URLs after the phase is merged and verify they open anonymously:

- Privacy: https://github.com/vanguard-com/app/blob/main/docs/PRIVACY.md
- Support: https://github.com/vanguard-com/app/blob/main/docs/SUPPORT.md

The app already opens that policy URL. The support page is new in this phase and becomes
available on main after merge. The owner can later host both pages on the website and update
`src/config/app.ts` and store metadata together.

Complete the live Apple age-rating and Google IARC questionnaires from the actual behavior.
Do not assume the former draft's “4+ / Everyone” is an assigned rating. There is no built-in
social feed, account, chat, advertising, gambling or paid content. User camera content and local
generated scene descriptions should be represented accurately. Select the intended audience in
the console; the app does not have a dedicated children's mode.
