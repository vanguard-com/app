# Lumi

Lumi helps blind and low vision people film videos on their own. It guides framing, lighting,
delivery and background with sound, voice and haptics, fully on device.

iOS 16.4+ and Android 10+ from one Expo / React Native codebase.

## Status

| Phase | Deliverable                                                   | State                                       |
| ----- | ------------------------------------------------------------- | ------------------------------------------- |
| 0     | Project setup, theme, navigation, CI, docs                    | Done, needs phone check                     |
| 1     | Cue engine, camera, recording, save                           | Done, needs phone check                     |
| 2     | Spatial sensing, subject setup, lens switching                | Implemented (face-first), needs phone check |
| 3     | Lighting check, scan mode                                     | Implemented, needs phone check              |
| 4     | Live feedback                                                 |                                             |
| 5     | Background recognition, scene description                     |                                             |
| 6     | Review, sharing, voice commands                               |                                             |
| 7     | Onboarding, settings polish, accessibility audit, performance |                                             |
| 8     | Store readiness                                               |                                             |

## Requirements

- Node.js 22 (20.19 minimum) and npm
- Android: Android Studio with Android SDK 36, JDK 17, a phone with USB debugging on
- iOS: a Mac with the latest Xcode (16.1 minimum), CocoaPods, an iPhone or iPad, a free or paid
  Apple ID
- Expo Go does **not** work: Lumi uses custom native modules, so it needs a development build

## First time Mac setup

Do this once (about 1 to 2 hours, mostly downloads). Skip the Android part if you only test Android
with the APK link below.

1. **macOS**: System Settings > General > Software Update. Install the latest update first, because
   the newest Xcode needs a recent macOS.
2. **Xcode**: App Store > Updates (or search Xcode) > Update. Open Xcode once, accept the licence
   and install the iOS platform when asked. Then in Terminal:
   ```sh
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   xcodebuild -runFirstLaunch
   ```
3. **Homebrew** (skip if `brew --version` works): follow https://brew.sh, then:
   ```sh
   brew install node@22 cocoapods watchman
   brew install --cask zulu@17
   ```
4. **Android Studio**: Android Studio > Check for Updates, install all. Then Settings > Languages &
   Frameworks > Android SDK: tick **Android 16 (API 36)** under SDK Platforms, and **Android SDK
   Build-Tools**, **Android SDK Platform-Tools** and **NDK (Side by side)** under SDK Tools. Apply.
5. **Shell settings**: add these lines to `~/.zshrc`, then open a new Terminal window:
   ```sh
   export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
   ```
6. **Check**: `node -v` (22.x), `pod --version`, `java -version` (17), `adb version` all print a
   version.

## Setup

```sh
git clone https://github.com/vanguard-com/app.git lumi
cd lumi
npm ci
npm run check        # typecheck + lint + tests
```

## Run on your phone

### Easiest: Android test APK from GitHub (no computer setup, $0)

Every update merged to `main` is built by GitHub Actions (`.github/workflows/android-apk.yml`) and
published as a pre-release.

1. On your Android phone, open
   https://github.com/vanguard-com/app/releases/download/android-latest/lumi-latest.apk
2. Allow your browser to install unknown apps when Android asks, then tap Install.
3. Later builds install over the old one (same signing key), settings are kept.

Pull request builds are attached to the "Android APK" workflow run as an artifact (zip) for 14 days.

### iPhone

Apple only allows installing your own builds through Xcode on a Mac (free Apple ID, see below) or
through TestFlight / EAS, which needs a paid Apple Developer account ($99 per year).

### Android over USB (no paid account)

1. On the phone: Settings > About phone > tap Build number 7 times, then Developer options > USB
   debugging on. Connect the cable and accept the prompt.
2. `npx expo run:android --device` builds, installs and starts the development build.
3. Later runs only need `npm start` while the app is installed (rebuild after native changes).

### iPhone or iPad with a free Apple ID

1. Xcode > Settings > Accounts: add your Apple ID.
2. Connect the iPhone / iPad by cable, unlock it and tap Trust.
3. iPhone: Settings > Privacy & Security > Developer Mode on (appears after first install attempt,
   the phone restarts).
4. In the `lumi` folder: `npx expo run:ios --device`, pick your iPhone. The first build takes 10 to
   20 minutes. If signing fails, open `ios/Lumi.xcworkspace` in Xcode, select the Lumi target >
   Signing & Capabilities > Team: your personal team, then run the command again.
5. iPhone: Settings > General > VPN & Device Management > trust your developer certificate.
6. Free Apple ID builds expire after 7 days; run the command again to reinstall.
7. Lumi now opens and connects to your Mac for JavaScript. After the first build, `npm start` is
   enough until native code changes (each phase note says when a rebuild is needed).

### EAS builds (cloud, no Mac needed for Android)

```sh
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android   # dev client APK
npx eas-cli@latest build --profile preview --platform android       # shareable APK, no Metro needed
npx eas-cli@latest build --profile production --platform all        # store builds (AAB + IPA)
```

iOS EAS builds need a paid Apple Developer account. `eas submit` for TestFlight and Google Play
internal testing is set up in Phase 8 once store accounts are connected.

## Scripts

| Command                           | What it does                                                              |
| --------------------------------- | ------------------------------------------------------------------------- |
| `npm start`                       | Start Metro for the development build                                     |
| `npm run android` / `npm run ios` | Build and run the native app locally                                      |
| `npm run prebuild`                | Regenerate `android/` and `ios/` from `app.json` (they are not committed) |
| `npm run typecheck`               | `tsc --noEmit`                                                            |
| `npm run lint`                    | ESLint + Prettier rules                                                   |
| `npm test`                        | Jest                                                                      |
| `npm run check`                   | All three, as CI runs them                                                |

## Native code

Lumi has one small native module of its own, `modules/lumi-hardware-buttons` (volume button
presses, see docs/DECISIONS.md D23). Expo links it automatically. After pulling changes that add
native code, rebuild the app (`npx expo run:ios --device` / `npx expo run:android --device`, or
install the new APK); `npm start` alone is not enough.

CI compiles both native apps on every pull request (`.github/workflows/android-apk.yml` and
`ios-build.yml`), so native build errors show up before anyone builds on a phone.

## Project structure

```
app/                    Expo Router screens
  (onboarding)/         Welcome / tutorial (route /welcome)
  camera.tsx            Main camera screen
  subject.tsx           Subject setup
  review.tsx            Review after recording
  settings/             Settings, one file per group
src/
  features/             framing, lighting, feedback, background, sharing
  cues/                 Cue engine (priority queue, rate limit, speech, earcons, haptics)
  audio/                Shared iOS audio session setup
  hooks/                App state and volume button hooks
  theme/                Design tokens (only place colours may be written) and contrast math
  components/           Accessible buttons, rows, header, status border
  store/                Zustand stores (settings persisted in MMKV)
  i18n/                 All user facing strings (en.ts)
  utils/                Accessibility helpers, time formatting
assets/models/          Bundled TFLite models (GGUF models download at runtime)
docs/                   DECISIONS, TESTING, PRIVACY, STORE_LISTING
modules/                Lumi's own native module (volume buttons)
scripts/                Icon generator
```

Pure logic (framing math, lighting math, cue priority) stays in plain TypeScript without React
imports so Jest can test it.

## Rules enforced by tests

- Every text / background token pair meets 7:1, icons and borders 3:1 (`src/theme/__tests__`)
- No colour literals outside `src/theme/theme.ts`
- Every screen: each control has label, role and hint; at most 4 controls besides Back (camera: 6)

## Privacy

No accounts, ads, analytics or cloud AI. Video and images never leave the phone. Voice commands
use the phone's own speech recognition, which may use Apple or Google servers when on device
recognition is not available. See [docs/PRIVACY.md](docs/PRIVACY.md) and decision D19.

Phase 3 lighting and light scan details, limitations and native rebuild requirements are in [docs/PHASE_3.md](docs/PHASE_3.md). Follow the Phase 3 section in [docs/TESTING.md](docs/TESTING.md) before merging.
