# Store privacy worksheet

Reviewed 24 October 2026 against the current code and provider documentation. This is release
evidence and a form worksheet, not a submitted privacy declaration. The original “No data
collected” draft is not suitable for the current dependencies.

## Approved SDK decision

The installed face detector uses Android `com.google.mlkit:face-detection:16.1.7` and iOS
`GoogleMLKit/FaceDetection 9.0.0`. Google's documentation says images/results stay on device,
but the SDK sends diagnostics and usage metrics, including per-installation identifiers.
There is no app-level metrics opt-out implemented or claimed in Lumi.

Owner decision, 24 October 2026: **keep ML Kit and disclose its metrics**. The existing SDK
behavior is retained and Camera explanations, About, policy and listing disclose it. This
explicitly replaces the original blanket no-analytics requirement for the SDK's technical
metrics. No advertising, app analytics service or new media upload is introduced. Final
store forms still need the versioned SDK report/provider review described below.

## Data flow inventory

| Flow                                        | Leaves device?                              | Recipient and retention                                                                   | Current controls                                             |
| ------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Camera analysis, face/pose/object estimates | No input images/results sent by Lumi/ML Kit | Local memory; only aggregate recording stats persist                                      | Camera access; feedback toggles                              |
| Saved video and voice measurements          | No upload by Lumi                           | Local file; latest 20 aggregate summaries; temporary WAV deleted                          | Record, Retake, Voice preferences                            |
| Live spoken commands                        | Sometimes                                   | Apple/selected Android recognition service; retention depends on provider                 | Local-first; deny speech/mic or use buttons                  |
| ML Kit diagnostics/usage                    | SDK can transmit                            | Google: device/app info, installation IDs, latency, configurations, sizes, events, errors | Retained with owner-approved metrics disclosure              |
| Model downloads                             | Network metadata                            | Hugging Face/CDNs: IP, requested pinned model file, request headers; vendor logs          | Explicit download, Wi-Fi default, cancel/delete              |
| User Share                                  | Yes, to selected app                        | Selected app controls further upload/retention                                            | Explicit system share sheet                                  |
| Photos/cloud backups                        | Depends on OS settings                      | User's Photos/backup provider                                                             | Photos add-only; Android app backup off; iOS models excluded |
| Hidden benchmark                            | No upload                                   | Local latest 20 outputs/device/model/timing records                                       | Explicit photo selection; Clear results                      |
| Support email / external links              | Only if opened/sent                         | Email provider, support team, browser/site                                                | Explicit user action outside Lumi                            |

## Apple App Privacy

Apple defines collection as transmitting off device with access beyond servicing the request
in real time. The developer must include relevant partner practices, not only its own servers.

- **Tracking:** Lumi has no advertising identifiers, ad SDK or cross-app advertising tracking.
  Do not request App Tracking Transparency solely for diagnostics.
- **SDK data:** review Device ID (per-installation identifier), Product Interaction (feature
  events), Performance Data (latency) and Other Diagnostic Data (configuration/errors/device/app
  information). Purposes include Analytics and App Functionality. Google documents that the
  installation ID is not intended to uniquely identify a user or physical device, but that
  alone does not prove Apple's “not linked” criteria. Confirm linkage/retention with the
  versioned SDK privacy report/provider guidance before entering final answers.
- **Live speech:** do not infer “not collected” because Lumi does not receive the audio.
  Determine the applicable Audio Data and provider handling from Apple's recognition guidance.
  Saved-video analysis has no server fallback.
- **Downloads:** Hugging Face documents access logs including IP/request information. Evaluate
  Other Data Types, identifiers or coarse location only to the extent actually derived/used;
  do not claim GPS/location collection or invent geographic processing from an IP alone.
- **Local media:** only local processing is not off-device collection. Distinguish the explicit
  user-directed Share action and OS backups from an app upload.
- The app's `privacyManifests` declares required-reason API use. CocoaPods aggregation remains
  enabled. That file is not the App Store privacy label and does not prove “Data Not Collected.”
  Inspect the signed archive's combined SDK privacy report and Apple's upload validation.

Do not advertise “Data Not Collected” for this build without resolving the SDK disclosures.
Use the current App Store Connect form; this worksheet intentionally leaves unsupported
linkage/retention attestations open.

## Google Play Data safety

Google defines collection as transmission off device, including through SDKs. Ephemeral
processing must still be included in the form and requires in-memory, request-only retention.

For the current ML Kit dependency, start the form with **data collection: Yes**:

| Candidate form entry                     | Evidence and purpose                                                | Required/optional review                                            |
| ---------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Device or other IDs                      | ML Kit per-installation identifier, diagnostics and usage analytics | Cannot claim optional without a working global opt-out              |
| App interactions                         | SDK feature events and utilization, Analytics                       | Runs with face detection; current camera dependency                 |
| Diagnostics / other app performance data | SDK latency, errors, app/OS/device/configuration metadata           | Follow Google's exact form categories and versioned SDK guidance    |
| Voice or sound recordings                | Live recognizer can send command audio, App functionality           | Commands optional; do not claim ephemeral without provider evidence |
| Other download-request data              | Hugging Face IP/file/request logs, App functionality                | Optional model downloads; inspect actual host processing            |

“No data shared” needs a separate assessment. Google lists exceptions for genuine service
providers, appropriate consent/user-initiated transfers and anonymous data. The explicit video
share may qualify as user-initiated, but **do not automatically apply that exemption to SDK
telemetry** or call every vendor a service provider without evidence. Google says ML Kit does
not transfer the listed collected data to further third parties; that does not erase its
collection from Lumi.

Model requests use HTTPS and Google's SDK documentation says its listed data is HTTPS encrypted.
Verify the selected speech service before making a blanket transit-encryption assertion.
Do not claim Lumi can delete Google's/Hugging Face's server logs. Explain local deletion and
provider deletion channels accurately. No app account is created, so there is no in-app account
deletion flow to advertise.

## Required-reason API rationale

The app manifest covers reasons supported by the shipped runtime and features:

| API category   | Reason | Use                                                             |
| -------------- | ------ | --------------------------------------------------------------- |
| UserDefaults   | CA92.1 | App preferences/runtime storage confined to the app             |
| FileTimestamp  | C617.1 | Attributes of app-container recording/model files               |
| DiskSpace      | E174.1 | Check available storage before writing/downloading a model      |
| SystemBootTime | 35F9.1 | Native runtime timing and relative inference/analysis intervals |

Other SDK reasons remain in their own manifests and aggregate during pod installation.
Keep the combined archive report and resolve any missing SDK signature/manifest warnings
before TestFlight/App Store distribution. This cloud check does not replace that validation.

## Sources

- [Apple App Privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google ML Kit terms and privacy](https://developers.google.com/ml-kit/terms)
- [ML Kit Android disclosures](https://developers.google.com/ml-kit/android-data-disclosure)
- [ML Kit iOS disclosures](https://developers.google.com/ml-kit/ios-data-disclosure)
- [Hugging Face privacy policy](https://huggingface.co/privacy)
- [Apple speech/Dictation privacy](https://www.apple.com/legal/privacy/data/en/ask-siri-dictation/)

Provider pages describe their latest SDKs; compare the resolved native versions and signed
archive before finalizing answers. Do not infer unverified retention from the absence of a
developer backend.
