# Lumi Privacy Policy

Effective date: [DATE OF FIRST RELEASE]
Contact: projectvanguard.sg@gmail.com

Lumi is a camera app that helps blind and low vision people film videos on their own. This policy
explains what happens to your information when you use Lumi.

## Summary

- Lumi does not collect, store on any server, sell or share any personal data.
- All camera and video analysis runs on your phone. Lumi never uploads your video or images.
- To understand voice commands, your phone's own speech recognition (Apple or Google) may send your
  voice to their servers when it cannot do the work on the phone. See "Speech recognition" below.
- Lumi has no accounts, no ads, no analytics and no tracking.
- Lumi itself only uses the internet to download AI model files from Hugging Face when you ask
  for scene descriptions.

## What Lumi uses on your phone, and why

| Permission         | What Lumi does with it                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Camera             | Shows and records video, and analyses frames on the phone to guide framing, lighting and background              |
| Microphone         | Records sound with your video, and measures loudness, pace and tone on the phone to give voice feedback          |
| Speech recognition | Listens for voice commands such as "start recording". See "Speech recognition" below                             |
| Photo library      | Saves your videos to your photos, automatically after recording with add-only permission, or when you retry Save |

You can turn any permission off in your phone's settings. Lumi tells you which features stop working.

## Data stored on your phone

- Your Lumi settings.
- Short statistics for your last 20 recordings (for example video length and percentage of time
  your face was in frame). No images or audio are kept in these statistics.
- Videos you record, until you delete them. Saved videos go to your photo library, which you control.
- Downloaded AI model files.

This data stays on your phone. On Android, Lumi turns off automatic app backup so it is not copied
to your Google account. Deleting Lumi deletes all of it except videos you saved to your photos.

## Speech recognition

Lumi uses the speech recognition built into your phone for voice commands. Lumi asks for recognition
on the phone whenever your phone supports it. When it does not, your phone may send live command
audio to Apple (iPhone) or Google (Android) to turn it into text. Speaking pace from a saved recording
uses only on-device recognition; it is unavailable when that cannot run locally. Apple or Google handles that audio under their own privacy policies:

- Apple: https://www.apple.com/legal/privacy/
- Google: https://policies.google.com/privacy

Lumi only receives the resulting text, uses it on your phone, and does not store it. You can use
every Lumi feature with buttons instead of voice.

## Model downloads

When you first ask Lumi to describe your background, it asks you before downloading an AI model
file from Hugging Face (huggingface.co). As with any download, Hugging Face receives your phone's IP
address and the name of the file requested. Lumi sends no personal data, images or audio with
the request. By default downloads only happen on Wi Fi.

## Sharing

When you choose Share or use the posting command on Review, Lumi opens your phone's share sheet. The app you pick (for example YouTube
or WhatsApp) receives the locally saved video under its own privacy policy. Photos access is not required for this handoff. Lumi does not upload anything itself and cannot tell whether the receiving app posted the video. Command listening pauses during playback and while the share sheet is open.

## Children

Lumi does not knowingly collect data from anyone, including children under 13 (or the age set by
local law), because it collects no data at all.

## Changes

If this policy changes, the new version will be posted at this address with a new effective date.

## Contact

Questions: projectvanguard.sg@gmail.com

## Light scanning

When you request a light scan, Lumi uses motion sensors and a small camera luminance grid to remember brighter directions. These readings are processed in memory on your phone, never uploaded or saved. Motion access is requested only for this feature; declining it does not disable ordinary lighting checks. Scanning stops when cancelled, recording starts, the camera screen closes or the app enters the background.

## Optional live feedback and voice measurements

Feedback mode estimates head direction, smiles and posture entirely on the phone. Only summary measurements for the latest 20 recordings are kept in Lumi's local settings storage; camera frames, raw landmarks and pose data are not retained or uploaded. Retake removes that video's summary from Lumi.

Optional Voice analysis, reached through Review and playback, reads the saved video locally, without opening another microphone. Temporary audio chunks are removed after analysis, cancellation or failure. Loudness and pitch stay on the phone. Speaking pace uses only on-device speech recognition when supported; if it is unavailable, Lumi reports pace unavailable rather than sending recorded audio to a server. Transcripts are not saved. The existing Apple/Google speech-service fallback for live commands is unchanged. Aggregate measurements are not calibrated health measurements.

## Background recognition and scene descriptions

Common object detection and optional scene descriptions run on the phone. Live object positions stay in memory. A requested description uses a temporary small camera snapshot, which is removed after completion, failure or cancellation. No image, prompt or output is sent to an AI server. Model downloads contact Hugging Face for the reviewed, pinned model files; these requests disclose ordinary network information such as IP address and requested model name. Both model files are checked before activation. iOS excludes the model directory from backup; Android app backup remains disabled.

The hidden benchmark uses the system photo picker, without broad photo-library access. It preserves original gallery photos and removes its temporary copies. It can store up to 20 local benchmark outputs and timings, including phone/OS and model revision. These outputs may describe the selected photo. Clear results removes them. Ordinary scene descriptions are not retained as benchmark results.

## Tutorial, practice and access choices

The tutorial and practice do not save a recording. After optional access setup, practice can show a local camera preview when you have allowed Camera; it has no microphone, recording or frame-analysis outputs. Pretend button/volume actions stay in memory. On iPhone, volume practice waits for that camera preview; declining Camera leaves the screen-button practice available. We store completion of access review with your local settings so automatic flows do not ask again for skipped access. You can request access explicitly from App access or retry Photos with Save. No tutorial/practice events or permission choices are sent to analytics or a server.
