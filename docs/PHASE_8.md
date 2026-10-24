# Phase 8 — store readiness

Status: release preparation implemented; store distribution and final privacy/phone acceptance
remain pending. Do not mark the brief's “Production builds succeed, ready for TestFlight and
Play closed test” criterion complete from an unsigned archive or a test-key AAB.

## Implemented

- Explicit development/preview/production native profiles, output types and iOS configurations.
  Production auto-increments remote build numbers. Android submission defaults to internal/draft.
- Release-only native module exclusions and permission/network hardening; development retains
  Metro and its launcher. Clean prebuild is required on profile switches.
- Required-reason API manifest entries and iOS privacy aggregation enabled.
- Real Expo plugin configuration checks for every profile, icon metadata, permissions and
  minimum versions.
- GitHub APK plus AAB compilation/16 KB/merged-manifest checks and unsigned iOS Release archive
  checks, with evidence artifacts. Signed EAS distribution remains an owner step.
- Listing corrected to current face-first functionality, model sizes, measured feedback,
  native sharing and platform limits. Existing Night/Amber icons are retained.
- Privacy policy and About/Camera explanations corrected for ML Kit SDK metrics, speech-provider
  fallback, model-host logs, system backups and explicit video sharing. A provider-sourced
  worksheet replaces the unsupported blanket “No data collected” answer.
- Release/account/signing instructions and support-page copy prepared without keys or account IDs.

## Cloud verification

Local results on 24 October 2026: TypeScript and ESLint (zero warnings) pass; all 1,001 Jest
tests in 42 suites pass. Both platform JS/Hermes exports pass. All three profiles pass real
Expo introspection and clean native generation; repeated production prebuild keeps one set of
exclusions. EAS JSON validates against @expo/eas-json 25.3.0. Existing icon sources are 1024px
and the main icon is opaque RGB. Store description is 2,517 characters and keywords 96,
within their limits.

Linked GitHub native results for the final commit are recorded in the phase PR. Android and
iOS native compilation run there. Neither cloud environment can establish physical
camera/audio/haptics, store signing or provider-retention facts.

## Release gates

| Gate                                               | Current result / required evidence                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Phase 7 native compilation                         | Both platforms passed before its merge                                                             |
| Phase 7 full reader/performance journey            | Physical results still pending                                                                     |
| Current head TS/lint/Jest/config/export/prebuild   | See phase PR evidence                                                                              |
| Current head production-profile native compilation | See Android/iOS runs linked from phase PR                                                          |
| Signed Android store AAB and iOS IPA               | Owner EAS/store accounts and dedicated credentials not connected                                   |
| ML Kit privacy decision                            | Owner approved retaining ML Kit with metrics disclosure, 24 October 2026                           |
| Final provider/SDK privacy forms                   | Worksheet prepared; linkage/retention and signed SDK report review pending                         |
| Public privacy/support pages                       | Owner approved existing GitHub policy until website is ready; support copy uses GitHub after merge |
| Store screenshots and feature graphic              | Actual release-device captures/export pending                                                      |
| Final TestFlight / Play testing acceptance         | Not uploaded or verified; owner console steps in RELEASE.md                                        |

## Physical release acceptance

Use release-mode builds without Metro. First use the PR APK for Android. For iOS use a local
Xcode Release build with appropriate signing, then repeat on the eventual TestFlight build.
Keep original recording examples private.

1. **Clean install and onboarding:** lessons, each optional permission and preview-only practice
   work. Skip/retry access, cancel requests and relaunch; choices remain. No local-network or
   Android overlay request appears. No developer launcher/menu appears.
2. **Complete readers:** run the entire PHASE_7 checklist with VoiceOver on iPhone/iPad and
   TalkBack on Android. Large text, landscape, Reduce Motion, heading focus and all controls
   remain usable without sighted help. Record device/OS, reader settings and failures.
3. **Record offline:** without model downloads and with live commands off, face/lighting/object/
   posture guidance works in airplane mode. Record sound, stop, review and play. Offline success
   does not prove absence of queued SDK telemetry.
4. **Audio and hardware:** test earphones/speaker, pause/resume, interruptions, supported volume
   keys and current key limits. Commands cannot trigger from playback. Retake/save/share and
   returning from another app cannot restart a recording.
5. **Photos denied and sharing:** record with Photos off. Playback and Share still use the app
   copy. Cancel the sheet, then send to an installed app and finish posting. Confirm output audio
   and orientation. Verify Save after granting access and confirm Retake preserves Photos copies.
6. **Models:** confirm displayed sizes/licences, Wi-Fi default, mobile-data opt-in, cancellation,
   successful local inference, deletion and object fallback. Measure Standard/Detailed on
   iPhone 12 / Galaxy A54 class devices. Do not advertise the five-second target as achieved
   until measured. Repeat under low storage and unsupported-memory conditions.
7. **Sustained camera:** measure preview smoothness, warmth, battery and memory over at least
   ten minutes, all modes, screen rotation and background/foreground. Analysis cadence is not
   preview fps. Record actual measurements instead of assumed 30 fps.
8. **Android 16 KB and store artifact:** install the signed production artifact on a 16 KB-page
   test device/emulator, exercise all native modules and verify Play's bundle validation,
   permissions, package, signing and target API. CI's ELF/zip checks do not replace this run.
9. **Signed iOS:** verify bundle/team/build number, archive SDK privacy/signature report and
   TestFlight processing; resolve upload warnings. Confirm policy/support links open without
   login and About/Camera disclosures match the actual SDK choice.
10. **Listing assets:** capture the real accepted iPhone/iPad/Android UI with consented media;
    check dark/light icons, themed Android icon, launcher masks and splash. Verify public
    policy/support links, finish privacy/rating forms, then stage internal/closed testers as documented.

## Acceptance record

- Release commit / Android versionCode / iOS build number:
- Android device/OS/page size and installation source:
- iPhone/iPad model, OS and installation source:
- Reader / large-text / reduced-motion results:
- Recording, audio, share, offline/model and sustained-performance results:
- ML Kit decision and final provider privacy evidence:
- Signed EAS build IDs and store validation results:
- Public URLs and actual screenshot files:
- Owner approval / remaining issues:

No physical-device or signed-store results were available when this checklist was prepared.
