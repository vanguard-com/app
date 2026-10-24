# Building and releasing Lumi

Phase 8 prepares the release configuration and unsigned/test-key native checks. Store
distribution still needs the owner's accounts, signing, privacy decisions and phone acceptance.
No account, signing identity, paid service or store submission was created by this work.

## Profiles

`app.json` holds the shared identifiers, permissions, icon/splash and privacy API reasons.
`app.config.js` selects the native build profile from `LUMI_BUILD_PROFILE`, then
`EAS_BUILD_PROFILE`, defaulting to development. Unknown profiles fail rather than silently
building the wrong app. EAS profiles explicitly set the same environment variable.

| Profile     | Native tools                               | Android                 | iOS                                         |
| ----------- | ------------------------------------------ | ----------------------- | ------------------------------------------- |
| development | Development launcher/menu, Metro discovery | Internal dev-client APK | Internal Debug development build            |
| preview     | No launcher/menu or development discovery  | Internal standalone APK | Internal Release, registered-device signing |
| production  | Same release hardening as preview          | Store AAB               | Store Release archive/IPA                   |

All keep `com.vanguard.lumi`, version 1.0.0, iOS 16.4+ and Android API 29+. Development builds
64-bit ARM plus x86_64 for emulators. Preview/production explicitly build arm64-v8a, matching
the supported phones and CI; unsupported 32-bit ABIs are excluded because llama.rn is 64-bit.
Preview and production
exclude `expo-dev-client`, `expo-dev-launcher` and `expo-dev-menu` from native module linking.
Their interfaces may remain as runtime dependencies; the actual launcher/menu are excluded.
A config plugin also removes development URL schemes and iOS local-network/Bonjour keys,
blocks Android overlay permission and disallows arbitrary cleartext networking. Required
Camera/Microphone, add-only Photos, Motion and Speech descriptions remain.

Native folders are ignored. **Clean prebuild whenever switching profiles.** Do not reuse a
production native folder for a later development build: exclusions are generated into native
files. Keep the environment variable set through prebuild, pod install and compilation.

## Free local device builds

Install Node 22, dependencies, Android SDK/JDK 17 or Xcode/CocoaPods as described in README.

```sh
npm ci
npm run check
npm run release:check

# Development: Metro, USB and no EAS account.
export LUMI_BUILD_PROFILE=development
npx expo prebuild --clean
npx expo run:android --device
# Or on a Mac:
npx expo run:ios --device
```

A free Apple ID can sign a local phone build through Xcode with its normal provisioning limits.
It cannot supply App Store/TestFlight distribution or an EAS ad-hoc tester profile.

For an Android standalone release-mode test build without an EAS account:

```sh
export LUMI_BUILD_PROFILE=preview
npx expo prebuild --clean --platform android
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

The generated template uses a **debug/test signing key**. This APK is useful for physical tests
and installs over previous GitHub test builds. It is not the Play upload identity. Do not
upload the CI AAB to Play or promote that key to a production credential.

## GitHub native evidence

The Android workflow builds `assembleRelease bundleRelease` with the production profile,
checks the **merged** manifest, arm64 ELF 16 KB segment alignment and APK zip alignment.
It publishes APK and **test-key AAB** artifacts for 14 days. Main additionally refreshes the
existing Android test pre-release. CI and EAS production both explicitly build arm64. Repeat the same alignment/console
checks on the eventual signed artifact.

The iOS workflow uses the production profile and `xcodebuild archive -configuration Release`
for generic iOS devices, signing disabled. It checks the built app's Info.plist, privacy API
reasons, embedded JavaScript and absence of dev-client bundles. Its evidence artifact contains
Info.plist, PrivacyInfo.xcprivacy, Podfile.lock and the archive log. The unsigned archive is not
an installable IPA and does not prove Apple upload validation.

`npm run release:check` exercises real Expo config plugins for all three profiles, permission
hardening, minimum versions, EAS output settings and existing 1024px icon source metadata.

## Connect owner accounts when ready

1. Retain the owner-approved ML Kit disclosures and GitHub policy URL in STORE_PRIVACY and
   STORE_LISTING. Verify both public GitHub pages after merging the phase. Finish the phone
   checks in PHASE_8. Use the actual chosen release commit.
2. Log in to the owner's Expo account and link this app with `npx eas-cli@latest login` and
   `npx eas-cli@latest init`. Review the account/project it selects. If dynamic config cannot
   be edited automatically, put the real non-secret `owner` and `extra.eas.projectId` in
   `app.json`; `app.config.js` preserves them. Do not invent a project ID or commit credentials.
3. Confirm `npx eas-cli@latest whoami` and `npx eas-cli@latest project:info`. Inspect both:
   `npx eas-cli@latest config --platform android --profile production` and the iOS equivalent.
4. With the owner's account, set initial remote versions once using
   `npx eas-cli@latest build:version:set --platform all --profile production`. The production
   profile uses remote versioning and auto-increments each platform's build counter.
5. Review Expo build-plan quotas/pricing before queuing hosted builds. Android USB/GitHub test
   builds remain available without paid accounts. Apple distribution needs the owner's Apple
   Developer membership; Google Play needs an owner developer account. No payment is triggered
   by the committed configuration.
6. Configure credentials interactively via `npx eas-cli@latest credentials --platform android`
   and `--platform ios`. Use a dedicated Play upload key and Play App Signing; iOS needs the
   correct team, distribution certificate and App Store provisioning profile. Keep keystores,
   service-account JSON, certificates and API keys in EAS/owner secret storage. Never commit
   them. `credentials.json`, native output and common key files are ignored.

## Signed builds and tester submission

After those steps and owner release approval:

```sh
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

Record the exact commit, EAS build IDs, version codes, certificate fingerprints and signed
artifact checks. Verify Android's AAB and generated APKs on 16 KB-page devices/Play validation;
verify the iOS archive privacy report and upload warnings. Install the signed build on both
phone platforms and run PHASE_8 before submission.

Create the store app records for `com.vanguard.lumi`, with listing, policy/support URLs, privacy
forms, current age-rating/IARC questionnaires, export compliance and actual screenshots.
Check the live consoles' current target-SDK/Xcode requirements and any personal-account closed
testing requirements. No credentials or numeric App Store record ID are guessed in `eas.json`.

Submit an **explicit approved build ID**, avoiding accidental selection of a newer build:

```sh
npx eas-cli@latest submit --platform android --profile production --id APPROVED_ANDROID_BUILD_ID
npx eas-cli@latest submit --platform ios --profile production --id APPROVED_IOS_BUILD_ID
```

Android submission is configured to the **internal** track with release status **draft**.
The owner must configure Play API access and, if required by the console, perform the first
manual AAB upload. Advance to closed testing manually after internal acceptance. The
Play service-account key belongs in the owner's credentials storage, not this repository.

iOS prompts for the actual App Store Connect app/team details. Set the real `ascAppId` in the
submit profile once the owner creates that record, or provide it interactively. Uploading sends
the build to App Store Connect; TestFlight processing, export/privacy questions and external
tester review still follow. There is no automatic App Store public release configured.

Internal/ad-hoc iOS preview also needs paid provisioning and registered tester devices:
`npx eas-cli@latest device:create`, then `npx eas-cli@latest build --platform ios --profile preview`.
Do not promise that an unsigned GitHub archive or an arbitrary IPA can install on an iPhone.
