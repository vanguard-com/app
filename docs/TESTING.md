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

| Code | Environment                                         |
| ---- | --------------------------------------------------- |
| E1   | Bright room, light from in front of the user        |
| E2   | Dark room, one small lamp                           |
| E3   | Backlit: user sits with a bright window behind them |
| E4   | Side lit: one lamp to the left or right of the user |
| E5   | Outdoors, daylight                                  |

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

| Zone          | Speech                                                        |
| ------------- | ------------------------------------------------------------- |
| Top left      | "Settings, button. Opens settings"                            |
| Top right     | "Flip camera, button. Switches between front and back camera" |
| Centre        | "Camera view, button. Double tap to hear current status"      |
| Bottom left   | "Mode: Framing, button. Double tap to switch guidance mode"   |
| Bottom centre | "Start recording, button. You can also press a volume button" |
| Bottom right  | "Subject: My face, button. Opens subject setup"               |

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

## Phase 1: cues, camera, recording, saving

New native code: install a fresh build (new APK, or rebuild with `npx expo run:ios --device`).
Before each step, note whether earphones are connected. Default setting: cues during recording =
Earphones only.

### 1.1 Permissions on first launch (fresh install)

1. Open Lumi, tap Start.
2. Expected: Lumi says why it needs the camera, then the system camera prompt appears. Allow.
3. Expected: same for microphone, then (iPhone) speech recognition. Allow both.
4. Reinstall and deny each one. Expected after each denial: Lumi explains what will not work and
   how to allow it in settings. With camera denied, the centre says "Camera access is off" and an
   "Open settings" button appears; it opens Lumi in the phone settings.

### 1.2 Live camera

1. Expected: live front camera fills the screen behind the controls.
2. Tap the centre (screen reader: double tap). Expected: "Camera ready. Front camera. Framing mode.
   Keeping my face in frame."
3. Tap Flip. Expected: "Back camera" and the back camera shows. Tap again: "Front camera".

### 1.3 Record with the record button (no earphones)

1. Tap Record. Expected within about 1 second: rising 3 note sound is NOT heard (no earphones),
   1 buzz, timer appears at top centre, button shape becomes a square.
2. Talk for 40 seconds, then tap the button again. Expected: 1 buzz, Review opens and says
   "Video length 40 seconds. Use Save to keep it in your photos, or Retake for a new one."
3. Tap Save. Expected first time: add-to-Photos permission prompt; then "Saved to Photos" with a
   2 note sound. Open the Photos / Gallery app: the video is there, with sound, right way up.
4. Note: is any buzz audible in the video's sound?

### 1.4 Record with earphones (wired and Bluetooth)

1. Connect earphones. Record for 70 seconds.
2. Expected in the earphones: start sound and "Recording", then "30 seconds", "1 minute".
3. Play the video: Lumi's sounds must NOT be in it, and your voice must sound normal (not like a
   phone call). Report the earphone model if it sounds like a phone call.

### 1.5 Volume button (iPhone with iOS 17.2 or newer, all Android phones)

1. On the camera screen, press either volume button. Expected: recording starts; the phone's volume
   does not change and no volume bar appears.
2. Press again. Expected: recording stops and Review opens.
3. Set the phone volume to maximum and repeat. Expected: still works.
4. On Review and Settings, volume buttons change the volume normally.
5. iPhone on iOS 16 / 17.0 / 17.1: volume buttons only change volume (expected, see DECISIONS D23).

### 1.6 Voice only and volume only (Phase 1 "done when")

1. Say "start recording". Expected: recording starts within about 1 second.
2. Press a volume button to stop (voice commands pause during recording by default).
3. On Review, say "save video". Expected: "Saved to Photos".
4. Record again, then on Review say "retake video". Expected: back on the camera, video deleted.
5. Say "switch camera" and "help". Expected: camera flips; Lumi lists the commands.
6. Say "check lighting". Expected: "That command comes in a later update."

### 1.7 Interruptions

1. Start recording, press Home / swipe to home. Reopen Lumi. Expected: recording stopped, Review
   shows the video up to that point.
2. Start recording, receive a phone call (or start a voice note in another app). Expected:
   recording stops and Lumi explains why.

### 1.8 Settings that change cues

1. Settings > Camera and recording > Cues during recording = Always on. Record without earphones.
   Expected: "Recording" and "30 seconds" on the loudspeaker (and therefore in the video).
2. Set Pause cues. Expected: no sound and no buzz while recording.
3. Settings > Camera and recording > Announce recording time = Every minute / Off. Expected:
   announcements follow the setting.
4. Settings > Sound and speech: change Voice speed and Cue volume, tap the camera centre. Expected:
   the status is spoken faster / slower, louder / quieter.

### 1.9 With VoiceOver / TalkBack on

1. Repeat 1.2, 1.3, 1.6. Expected: Lumi's messages are spoken by the screen reader voice, never two
   voices at once.
2. Swipe through the camera controls while voice commands are listening, without earphones.
   Expected: the screen reader reading "Record", "Flip camera" etc. never triggers a command.

## Full screen reader run (final acceptance, Phase 7)

Run the whole flow without looking at the screen, once with VoiceOver (iOS) and once with TalkBack
(Android): first launch tutorial, permissions, set subject, frame face, check lighting, record,
review, save, share to YouTube. Record every point where sighted help was needed.

## Results

| Date | Phone | OS  | Commit | Section | Reader | Result | Notes |
| ---- | ----- | --- | ------ | ------- | ------ | ------ | ----- |
|      |       |     |        |         |        |        |       |

## Phase 2 phone test (required before merge)

1. Install the APK artifact from the Phase 2 PR run, not the shared main release. Confirm the tested commit SHA.
2. Start with front camera, auto lens off and both voice and tones on. Move the phone left/right/up/down while your face starts off-centre. Each instruction and earphone channel should correspond to the physical direction that brings your face into the safe area. Repeat with rear camera and a stationary face.
3. Close your eyes while standing still or sitting. Follow the cues slowly. A chime and one vibration should confirm the face fits; holding still should not repeat the confirmation. Move out and back in to trigger another confirmation.
4. Cover the camera or leave the view. After roughly one second, guidance must say the face is not found and must stop directional tones. Return to reacquire. Add a second person: tracking should hold the original face until it is lost.
5. Repeat portrait, both landscape directions, rotation mid-session, and front/rear flips. Confirm guidance against the visible preview using a sighted helper. No reversed directions or stale good state.
6. Move too close and too far. Enable automatic lens switching: expect small, spaced zoom changes only while idle and only within hardware capabilities. A single-lens phone should remain usable. Disable the setting and verify no further automatic changes.
7. Record with face guidance. Zoom must stay fixed. Test Earphones only without headphones, with wired/Bluetooth headphones, Pause cues and Always on. Confirm the expected silence/haptics and no broken audio in the recorded clip.
8. Stop: Photos permission must be explained before the first prompt. Grant it and verify exactly one new video with sound in Photos; Save again must not duplicate it. Deny access on a fresh install: clip remains in Review, which announces the issue and supports retry. Retake keeps any already saved Photos copy.
9. Background the app, lock/unlock, navigate into setup/settings, and return. No guidance should continue while inactive; recording should stop safely and remain recoverable.
10. Complete subject setup, record, stop and retry save with TalkBack/VoiceOver. Confirm four camera controls, 60-point targets, large text usability, and no commands triggered by UI labels. On camera, say focus on my face; unsupported targets should explain that only face tracking is available.
11. Enable the hidden debug display via five version taps. Record guidance updates/second and preview smoothness on each device for two minutes; note heat, battery, detector errors, and any recording interruptions. Target 10–12 guidance updates/second, with smooth 30 fps preview.

Report phone/OS, commit SHA, screen-reader state, camera/orientation, and the numbered step for any failure. Merge only after Mike confirms the phone test passes.

## Phase 3 phone test (required before merge)

Install a **new native APK/development build from this phase's PR artifact**, and record the commit SHA. The new sensor and camera worklet modules will not work in an old development client. Repeat on Android and iPhone, with TalkBack/VoiceOver off and on. If Phase 2 has not been accepted on a phone, run its checklist first.

1. Open Camera. Framing should behave as before. Tap the mode control to select Lighting; only Framing and Lighting should be offered. Check all controls have spoken names/hints and remain reachable with large text, portrait and landscape. Flip cameras, leave/return and rotate; neither camera startup errors nor a blank/frozen preview should occur. The camera must never attach both analysis outputs simultaneously.
2. In a room lit evenly from in front, hold a face in view for two seconds. Expect “Lighting good” once, then silence. Tap the camera status area to hear it again. Move out of view: expect the face-missing explanation rather than a continuing good result. Cover the camera in a dark room (E2): expect darkness guidance after settling. Uncover: the result must recover.
3. Put a bright window behind the face (E3). Expect the backlight instruction, even if overall brightness is high. Turn towards the light and hold still: expect a fresh measurement and good lighting if the face is evenly lit. Repeat outdoors (E5); note auto-exposure behavior and any false results.
4. Use a side lamp (E4), first to the left then to the right. Expect the darker side to be identified consistently with the visible preview. Move the lamp above then below the face to check vertical shadows. Repeat front/back and both landscape directions. Record any reversed direction or false shadow. Thresholds in `src/features/lighting/config.ts` require these results before calibration is considered complete.
5. Say “check lighting.” Expect Lighting mode and a spoken current measurement (or “measuring” during startup). Say “find light,” or use Light scan. The motion explanation must precede any system permission prompt. Decline motion permission: expect an explanation, with ordinary lighting and recording still usable. Retry after enabling Motion and Fitness in Settings. Test a device without motion support if available.
6. For a scan, stay seated or in another safe stationary location, phone upright. Use a distinct lamp/window in one direction. Slowly turn yourself and the phone through a full circle, over roughly 35–60 seconds. Expect coverage to increase, then a shorter left/right turn instruction and directional tone. Follow it slowly; a centred tone plus a chime/vibration should confirm the brighter sampled direction after holding still. Verify the indicated direction against the real light with a sighted helper. Repeat clockwise and counter-clockwise, crossing the starting heading, and on both camera facings. Afterward, face-lighting guidance must measure again rather than assume the face is well lit.
7. Try a partial turn, repeated small left/right rocking, a uniform wall and a very dark room. None may report a reliable completed scan. A stalled/incomplete scan must explain failure within 90 seconds. Try landscape and tilted holding; record unreliable direction/drift as failures, not successes. Camera auto exposure may make uniformly exposed scenes indistinguishable.
8. Cancel by button and by saying “cancel light scan” during collection and during return guidance. Start a scan then navigate away, flip cameras, lock/background the app, or begin recording with the volume button. Scanning and its sensor subscription must stop, with no late restart after a permission dialog or spoken instruction. Returning must require an explicit new scan.
9. Record in Lighting with Earphones only (headphones connected and disconnected), Pause cues, Always on, and Tone only/Voice only/Both. Verify no unintended speech on the loudspeaker, correct screen reader routing, no overlapping guidance, valid saved video with sound, and a smooth preview. The scan button must not start a scan during recording. Test spoken scan requests during recording if that optional voice setting is enabled: expect refusal. A spoken lighting request while recording in Framing must also refuse to change mode; in Lighting it may read the current measurement.
10. Enable debug with five version taps. Log frame/face brightness, device/OS, orientation, facing and lighting scenario. Check a two-minute session for heat, stutter and battery impact. Do not merge until native CI and these phone checks pass; send observations for calibration rather than changing thresholds blindly.

## Phase 4 phone acceptance (required before merge)

Use a new native build from this phase branch/PR and record device, OS, commit, camera facing, orientation, screen-reader state and cue settings. Run once without and once with VoiceOver/TalkBack. Native CI must pass first; no cloud/mock test substitutes for the phone's camera, resizer, audio decoder or speech service.

1. Confirm Framing and Lighting still work. Camera mode now cycles through Feedback as well. With the master off, Feedback must say it is off, emit no guidance and still record. Turn the master on in Settings (or say “feedback on” while idle) and select Feedback before recording. At most six camera controls and four controls on other screens must remain accessible at large text sizes.
2. For head-facing: keep the face visible, look towards the camera, then turn left/right or look down for over three seconds. Expect the camera-look cue only after sustained deviation. A brief glance must not cue. Cover/lose the face or turn off Eye contact: no stale cue or good percentage. Repeat front/back, both landscape directions, rotation and a second person entering; only the tracked face should drive feedback. This measures head facing, not true gaze at the lens.
3. For expression: use Detailed verbosity and keep a neutral visible face for over 15 seconds. Expect a gentle smile suggestion. Smile to reset it. Standard/Minimal or Expression off must never prompt a smile. Low-confidence/no classification must appear as unmeasured. Smiling measurements can still contribute to Review when enabled.
4. For posture: frame head, shoulders and torso. Hold an upright position, then tilt the head or lower/shift the head relative to shoulders for over three seconds. Expect the appropriate level-head/upright cue, not an immediate response to movement. Turn Posture off: no inference/advice for it. Crop shoulders, introduce another person, or test an unsupported GPU: expect unknown/unavailable rather than incorrect advice about a different person. Repeat all orientations/facings; record false positives for threshold calibration.
5. Sustain two problems (for example head turned and slouching). Both should get a turn through the shared priority-4 queue, without talking over each other or system messages. Correct one problem and verify its queued cue clears. Check Tone only/Voice only/Both and Earphones only/Pause/Always on during recording; feedback must not contaminate speaker recordings when policy suppresses it. Toggle the master/types off and on and background/leave the app: analysis and old cues must stop/reset. A spoken request must not change camera analysis modes during filming.
6. Record a mixture of good/poor/hidden face/posture. Review must display and speak percentages and measured durations, explicitly saying unmeasured where a type was off or unavailable. Gaps must not count as perfect data. Repeat/retake and restart the app; the newest 20 local summaries must persist, and Retake must remove its summary without removing the Photos copy.
7. Enable Voice feedback and record a clip with normal speech, deliberately quiet speech, varied intonation and at least 20 seconds of steady pitch. The video must keep its normal audio, with no second live microphone. In Review choose Voice analysis (or say “analyse my voice”). Expect progress, quiet-sample measurements and a pitch-variation estimate; a short/silent clip must report insufficient data, not “monotone.” Detailed may suggest varying tone; Standard/Minimal must not give that advice. These are relative digital levels, not calibrated loudness.
8. Check pace at approximately 100, 145 and 190 words/minute with an offline English pack and speech permission. Expect slow/target/fast advice from saved audio, without a network request. Disconnect Internet and repeat. Android 10–12, missing offline packs, denied permission and recognizer errors must leave loudness/pitch working while reporting pace unavailable. Do not enable a server fallback for saved recordings.
9. Put command phrases such as “retake video” and “save video” inside a recording, then analyze it. No app action may fire from file recognition. While analyzing, cancel, retake, navigate away or background the app, then retry. Temporary WAVs must be cleaned, no late result may attach to another recording, the original video/Photos copy must remain intact, and ordinary voice commands must resume after analysis releases the recognizer. Test decoder/recognizer errors and clips longer than 30 seconds to exercise chunk transitions.
10. Check microphone/speech permission changes, silent/no-audio clips and a two-minute session for preview smoothness, heat and audio integrity. Actual simultaneous microphone sharing is not implemented or claimed; voice measurements deliberately run after recording. Record problems in the results table and do not mark Phase 4 accepted until both platforms pass.
