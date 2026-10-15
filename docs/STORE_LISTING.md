# Lumi store listing (draft, finalised in Phase 8)

## Names

| Field                         | Limit | Text                                                                       |
| ----------------------------- | ----- | -------------------------------------------------------------------------- |
| App name                      | 30    | Lumi                                                                       |
| iOS subtitle                  | 30    | Film yourself without sight                                                |
| Google Play short description | 80    | Talking camera that guides blind and low vision creators to frame and film |

## Keywords (iOS, 100 characters, comma separated, no spaces)

```
blind,low vision,voiceover,talkback,accessible,camera,video,vlog,selfie,framing,lighting,creator
```

## Full description

Lumi helps blind and low vision people film great videos on their own. It guides you with sound,
voice and vibration, so you never need to see the screen.

FRAME YOUR SHOT
A tone in your earphones tells you where to move the phone: left ear means move left, higher pitch
means move up. When your face (or your mug, laptop or whole body) is in frame, you hear a chime and
feel one buzz. Lumi tells you when your head is cut off and switches to the wide lens if needed.

FIX YOUR LIGHTING
Lumi checks if the room is too dark, if a window is behind you, or if one side of your face is in
shadow, and tells you how to turn. Scan mode finds the brightest direction in the room.

IMPROVE YOUR DELIVERY
Optional live tips on eye contact with the lens, smiling, posture, speaking volume and pace.

KNOW YOUR BACKGROUND
Ask "what is behind me" to hear the objects around you. Ask for a scene description and an AI model
running on your phone describes your background and anything distracting.

RECORD AND POST
Start and stop with the volume button, the big record button or your voice. After each video, Lumi
reads a summary: length, how long you were in frame, lighting quality. Then save or share to
YouTube, TikTok, Instagram, WhatsApp and more.

PRIVATE BY DESIGN
Camera analysis runs on your phone. No account, no ads, no tracking. Your video and images never
leave your phone.

## Accessibility features

- Full VoiceOver and TalkBack support, every control labelled with a hint
- Works without looking at the screen: stereo tones, speech and haptics
- Volume button and voice command control
- Large 60 point touch targets in screen corners, at most 4 controls per screen
- High contrast Night and Amber theme, 7:1 text contrast, respects system text size
- Status never shown by colour alone: border style, icon and vibration differ too
- No flashing or fast animation

## Screenshot captions

1. Tones guide your face into frame
2. Hear when lighting is too dark or backlit
3. Ask "what is behind me"
4. Live tips on eye contact and pace
5. Spoken summary after every video
6. Share to any app in one tap

## App review notes

Lumi is an accessibility camera for blind and low vision users. To test without a screen reader:
open Lumi, tap Start, point the front camera at your face. You will hear tones guiding you into
frame. Tap the record button (bottom centre) or press a volume button to record.

- Camera: shows and records video; frames are analysed on device to guide framing and lighting.
- Microphone: recorded with the video; loudness and pitch analysed on device for voice feedback.
- Speech recognition: voice commands like "start recording" and speaking pace feedback.
- Photo library: saving videos the user chooses to keep.

No account or login. Lumi uploads nothing. Its only network use is an optional, user confirmed
download of an on-device AI model from huggingface.co. Voice commands use the system speech
recognizer (on device when supported, otherwise Apple / Google speech service).

## Privacy answers

- App Store privacy label: Data Not Collected (Lumi never receives audio; speech goes only to
  Apple's own recognizer). Final check in Phase 8, see DECISIONS D19
- Google Play data safety: No data shared. Collection answer for voice (system recognizer,
  processed ephemerally) to be confirmed in Phase 8
- Privacy policy URL: [URL where docs/PRIVACY.md is hosted, owner's domain pending]
- Support email: projectvanguard.sg@gmail.com

## Screenshot sizes needed

- iPhone 6.9 inch (1320 x 2868) and iPad 13 inch (2064 x 2752)
- Google Play phone screenshots (at least 2, 16:9 or 9:16)

## Category and rating

- Category: Photo & Video (secondary: Utilities / Accessibility where available)
- Age rating: 4+ / Everyone
