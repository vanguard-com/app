# Lumi manual test script

Automated checks (`npm run check`) cover pure logic, theme contrast and screen accessibility rules.
Camera, sound, haptics, speech and real screen reader behaviour can only be tested on a phone, with
this script.

## Before every test session

1. Install the latest build (see README, "Run on your phone"):
   - Android, simplest: open
     https://github.com/vanguard-com/app/releases/download/android-latest/lumi-latest.apk on the
     phone and install. No computer needed.
   - Development build instead: run `npm start` on your computer, phone on the same Wi Fi.
2. Note phone model, OS version and Lumi build (the release title on GitHub shows the commit).
3. Test each section twice: once with the screen reader off, once with it on.
   - iOS: Settings > Accessibility > VoiceOver (or triple click side button if shortcut is set)
   - Android: Settings > Accessibility > TalkBack (or hold both volume keys 3 seconds if shortcut is set)
4. Write results in the table at the end: pass, fail, notes.

## Test environments (from Phase 2 on)

| Code | Environment |
|---|---|
| E1 | Bright room, light from in front of the user |
| E2 | Dark room, one small lamp |
| E3 | Backlit: user sits with a bright window behind them |
| E4 | Side lit: one lamp to the left or right of the user |
| E5 | Outdoors, daylight |

## Phase 0: app shell

### 0.1 Install and launch
1. Install the build and open Lumi.
2. Expected: amber ring icon on dark background in the launcher. Splash shows the same mark on dark
   background, then the Welcome screen.

### 0.2 First launch goes to Welcome
1. Fresh install (or delete app data), open Lumi.
2. Expected: Welcome screen. With screen reader on you hear "Welcome to Lumi".
3. Tap Start (screen reader: double tap).
4. Expected: Camera screen, dark. Screen reader says "Camera. Record button at bottom centre."
5. Close Lumi fully and open again. Expected: opens straight on Camera, not Welcome.

### 0.3 Camera screen zones (screen reader on)
Swipe right through the screen. Expected order and speech:

| Zone | Speech |
|---|---|
| Top left | "Settings, button. Opens settings" |
| Top right | "Flip camera, button. Switches between front and back camera" |
| Centre | "Camera view, button. Double tap to hear current status" |
| Bottom left | "Mode: Framing, button. Double tap to switch guidance mode" |
| Bottom centre | "Start recording, button. You can also press a volume button" |
| Bottom right | "Subject: My face, button. Opens subject setup" |

Note any zone read out of order, read twice, or missing.

### 0.4 Camera controls (Phase 0 has no live camera yet)
1. Double tap Flip camera. Expected: hears "Back camera". Again: "Front camera".
2. Double tap Mode 4 times. Expected: "Lighting", "Feedback", "Background", "Framing".
3. Double tap Record. Expected: "Recording", a timer appears at top centre, record button inner
   shape changes from circle to square.
4. Wait 5 seconds, double tap Stop recording. Expected: "Recording stopped", Review screen opens.
5. On Review, double tap Retake. Expected: back on Camera.
6. Double tap Subject, pick "My whole body". Expected: "My whole body selected", back on Camera,
   bottom right button now says "My whole body".

### 0.5 Settings
1. Camera > Settings. Expected: 4 buttons: Sound and speech, Live feedback, Camera and recording, More.
2. Sound and speech > Verbosity. With VoiceOver: swipe up / down changes value (Minimal, Standard,
   Detailed). With TalkBack: double tap steps forward. Expected value spoken each time.
3. Change Voice speed and Cue volume. Expected: percentage spoken.
4. Live feedback: switch says "on" / "off" when toggled. "Choose feedback types" shows 4 switches.
5. Camera and recording: 2 adjustable rows, 2 switches.
6. Fully close Lumi, reopen, return to Settings. Expected: all changes kept.
7. More > About. Tap the version text 5 times quickly. Expected: "Debug overlay on". 5 more times:
   "Debug overlay off".
8. More > Replay tutorial. Expected: Welcome screen with a Back button; Start returns to More.
9. More > Privacy policy. Expected: browser opens the policy page.

### 0.6 Visual checks (screen reader off)
1. Phone in dark mode: Settings, Review, Welcome are dark. Phone in light mode: they are white with
   near black text. Camera is dark in both.
2. Set phone text size to the largest (iOS: Accessibility > Display & Text Size > Larger Text;
   Android: Display > Font size). Expected: all text grows, nothing is cut off, screens scroll.
3. Every button is at least a fingertip wide (60 pt). Nothing flashes or pulses.
4. Rotate phone to landscape on Camera. Expected: buttons stay in the 4 corners and bottom centre.

## Full screen reader run (final acceptance, Phase 7)

Run the whole flow without looking at the screen, once with VoiceOver (iOS) and once with TalkBack
(Android): first launch tutorial, permissions, set subject, frame face, check lighting, record,
review, save, share to YouTube. Record every point where sighted help was needed.

## Results

| Date | Phone | OS | Commit | Section | Reader | Result | Notes |
|---|---|---|---|---|---|---|---|
| | | | | | | | |
