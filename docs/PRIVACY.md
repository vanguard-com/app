# Lumi Privacy Policy

Last updated: 24 October 2026

Contact: projectvanguard.sg@gmail.com

Lumi helps blind and low vision people film videos. This policy describes the current app,
including services supplied by Apple, Google and Hugging Face.

## Camera, recordings and local analysis

Framing, lighting, posture, object detection and optional scene descriptions run on your phone.
Lumi does not send camera images, videos, face landmarks or scene prompts to an AI server.
Face tracking is used to guide framing, not to identify people. Estimates can be wrong.

Recordings are stored in Lumi's app storage. With permission, Lumi also adds finished videos to
Photos. Photos access is add-only; Lumi does not need broad access to your photo library.
Sharing a video saved in Lumi works without Photos permission. Retake deletes Lumi's copy and
its summary; a copy already saved to Photos remains under your control.

Optional saved-video Voice analysis reads the local recording and extracts temporary audio.
Loudness and pitch measurements run locally. Pace uses on-device file recognition only; if it
cannot run locally, pace is unavailable. Temporary audio is deleted after completion,
cancellation or failure. Transcripts and raw audio samples are not kept as statistics.

## Google ML Kit diagnostics

Lumi currently includes Google ML Kit Face Detection. Google states that images and detection
results are processed on device and are not sent to Google. The SDK can nevertheless contact
Google for service maintenance and send technical diagnostics and usage metrics, including:

- Device model, operating system, app identifier and version.
- A per-installation SDK identifier.
- Detection latency, API configuration, input/output sizes, feature events and error codes.

Google uses these metrics to diagnose, maintain and improve its APIs and detect misuse or
abuse. This SDK activity is separate from camera analysis; offline analysis does not imply
that the SDK never uses the network. Lumi does not add advertising or an app analytics service.

See [Google's ML Kit terms and privacy information](https://developers.google.com/ml-kit/terms),
its [Android disclosures](https://developers.google.com/ml-kit/android-data-disclosure),
its [iOS disclosures](https://developers.google.com/ml-kit/ios-data-disclosure), and
[Google's Privacy Policy](https://policies.google.com/privacy).

## Live spoken commands

Lumi uses the phone's system speech recognizer. It requests on-device recognition when
supported. Otherwise live command audio may go to Apple or the Android speech provider
(commonly Google), which returns text. The provider controls its processing and retention;
Lumi cannot promise that processing is ephemeral. Lumi uses recognized command text locally
and does not save it.

Listening pauses during playback, sharing and saved-recording analysis, and during filming
by default. You can use buttons instead of spoken commands and turn off speech/microphone
access in phone settings. Without microphone access, videos have no sound.

- [Apple Privacy Policy](https://www.apple.com/legal/privacy/)
- [Apple Ask Siri, Dictation & Privacy](https://www.apple.com/legal/privacy/data/en/ask-siri-dictation/)
- [Google Privacy Policy](https://policies.google.com/privacy)

Saved-video analysis does not use this server fallback.

## Optional model downloads

Scene descriptions need a model and its vision projector. Lumi explains the size, licence and
requirements and asks before downloading. Standard is about 546 MB; Detailed is about 3.91 GB
and needs a sufficiently capable phone. Both models run locally after installation. Downloads
use Wi-Fi by default; mobile data is an optional setting. You can cancel and delete models.

Downloads contact Hugging Face and its delivery providers over HTTPS. Those providers receive
ordinary request information such as your IP address, requested filename and network/device
headers. Their [privacy policy](https://huggingface.co/privacy) describes logging and retention.
Lumi does not send images, videos, audio or scene prompts with model download requests.
No Hugging Face account is needed in Lumi.

## Information kept on your phone

- Preferences, tutorial completion and access-review choices.
- Aggregated statistics for the latest 20 recordings, such as duration and measured framing,
  lighting and delivery. No frames, landmarks, transcripts or raw measurements are retained
  in these statistics.
- Recordings in Lumi and any copies you save to Photos.
- Optional downloaded models, verified against pinned checksums.
- Up to 20 results from the hidden scene benchmark, including generated descriptions,
  timing, model revision and device/OS information. Clear results deletes these records.
  Benchmark photo-picker copies are temporary; gallery originals are unchanged.

Light scan uses luminance and motion readings in memory. It does not save or upload scan
headings or light grids. Tutorial/practice actions are not recorded as analytics events.
Practice can show a permitted camera preview but creates no recording and uses no microphone.

Android automatic app backup is disabled. iOS excludes downloaded models from backup; other
app documents and settings may be included in Apple backups depending on your system settings.
Photos may also sync through iCloud Photos, Google Photos or another service you configure.
These system services are controlled by you and their providers.

Deleting Lumi removes its local app data, subject to any OS backups you control. It does not
delete copies in Photos, backups, or apps to which you shared a video. SDK/provider data is
handled under the respective provider policies; contact them for their deletion options.

## Sharing and external links

Share opens the system share sheet. Only the app you select receives the local video; it may
upload or publish it under its own privacy policy. Lumi does not perform a direct upload and
cannot confirm whether that app published your video. Saving to Photos can also cause a
system photo-cloud sync if you have enabled one.

Opening privacy, licence or support links opens another app/browser. Its provider may receive
ordinary network information. If you email support, the address and information you choose to
send are available to the support team and its email provider. Do not send sensitive recordings
unless you intend to share them.

## Accounts, advertising and children

Lumi has no user accounts, advertising, purchases or advertising tracking. There is no developer
server receiving your recordings. The third-party processing described above still applies.
Lumi is a general camera utility; it does not offer a child profile or a social network.

## Changes and contact

Updates to this policy will appear at its published address with a revised date. For privacy,
accessibility or support questions, email projectvanguard.sg@gmail.com.
