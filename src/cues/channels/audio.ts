import { AppState } from 'react-native';
import { AudioContext } from 'react-native-audio-api';

import { applyAudioSession } from '@/audio/audioSession';

import { EARCONS } from '../earcons';
import type { Earcon } from '../types';

// Soft attack / release so tones never click.
const ATTACK_S = 0.01;
const RELEASE_S = 0.04;

let context: AudioContext | null = null;

function getContext(): AudioContext {
  if (!context) {
    applyAudioSession();
    context = new AudioContext();
  }
  return context;
}

// Release the audio engine while Lumi is in the background (battery) and wake it on return.
AppState.addEventListener('change', (state) => {
  if (!context) return;
  if (state === 'active') context.resume().catch(() => {});
  else context.suspend().catch(() => {});
});

/**
 * Play one sine tone. `pan` -1 = left ear, +1 = right ear. Used by earcons now and by the framing
 * guidance tone in Phase 2.
 */
export function playTone(options: {
  frequency: number;
  durationS: number;
  pan?: number;
  volume: number;
  startInS?: number;
}): void {
  try {
    const ctx = getContext();
    const start = ctx.currentTime + (options.startInS ?? 0);
    const end = start + options.durationS;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = options.frequency;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(options.volume, start + ATTACK_S);
    gain.gain.setValueAtTime(options.volume, Math.max(start + ATTACK_S, end - RELEASE_S));
    gain.gain.linearRampToValueAtTime(0, end);

    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, options.pan ?? 0));

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.01);
  } catch (error) {
    console.warn('Could not play tone', error);
  }
}

export function playEarcon(earcon: Earcon, volume: number): void {
  for (const note of EARCONS[earcon]) {
    playTone({
      frequency: note.frequency,
      durationS: note.duration,
      volume: volume * 0.6,
      startInS: note.start,
    });
  }
}
