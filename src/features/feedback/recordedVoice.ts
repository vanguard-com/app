import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

import { claimSpeech } from '@/features/voice/speechLease';

import { extractAudio, cleanupAudio, cancelExtraction } from '../../../modules/lumi-audio-analysis';
import { FEEDBACK } from './config';
import { analyseVoice, pitchVariation, wordsPerMinute } from './voiceMath';

export interface VoiceSummary {
  measuredMs: number;
  meanDb: number | null;
  quietPercent: number | null;
  pitchVariationSemitones: number | null;
  monotone: boolean | null;
  wordsPerMinute: number | null;
  paceAvailable: boolean;
}

export function decodeWav(bytes: Uint8Array): Float32Array {
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (offset: number, n: number) =>
    String.fromCharCode(...bytes.subarray(offset, offset + n));
  if (bytes.length < 44 || ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WAVE')
    throw new Error('Invalid WAV');
  let valid = false;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const length = data.getUint32(offset + 4, true),
      start = offset + 8;
    if (start + length > bytes.length) throw new Error('Truncated WAV');
    if (ascii(offset, 4) === 'fmt ')
      valid =
        length >= 16 &&
        data.getUint16(start, true) === 1 &&
        data.getUint16(start + 2, true) === 1 &&
        data.getUint32(start + 4, true) === 16000 &&
        data.getUint16(start + 14, true) === 16;
    if (ascii(offset, 4) === 'data') {
      if (!valid || length % 2) throw new Error('Unsupported WAV');
      const samples = new Float32Array(length / 2);
      for (let i = 0; i < samples.length; i++)
        samples[i] = data.getInt16(start + i * 2, true) / 32768;
      return samples;
    }
    offset = start + length + (length % 2);
  }
  throw new Error('Missing PCM data');
}

async function offlineAvailable(): Promise<boolean> {
  if (Platform.OS === 'android' && Number(Platform.Version) < 33) return false;
  if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) return false;
  const permission = await ExpoSpeechRecognitionModule.getPermissionsAsync();
  if (!permission.granted) return false;
  if (Platform.OS === 'android') {
    const locales = await ExpoSpeechRecognitionModule.getSupportedLocales({});
    return locales.installedLocales.some((locale) => locale.toLowerCase().startsWith('en'));
  }
  return true;
}

function recognize(uri: string, signal: AbortSignal): Promise<string | null> {
  return new Promise((resolve) => {
    let text = '',
      final = '';
    let done = false;
    const subscriptions: { remove: () => void }[] = [];
    const finish = (value: string | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      subscriptions.forEach((s) => s.remove());
      signal.removeEventListener('abort', abort);
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {}
      resolve(value);
    };
    const abort = () => finish(null);
    const timer = setTimeout(() => finish(null), 60_000);
    subscriptions.push(
      ExpoSpeechRecognitionModule.addListener('result', (event) => {
        const transcript = event.results[0]?.transcript?.trim() ?? '';
        if (event.isFinal) {
          final = transcript.startsWith(final) ? transcript : `${final} ${transcript}`.trim();
          text = '';
        } else text = transcript;
      }),
    );
    subscriptions.push(
      ExpoSpeechRecognitionModule.addListener('end', () => finish((final || text).trim() || null)),
    );
    subscriptions.push(ExpoSpeechRecognitionModule.addListener('error', () => finish(null)));
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) {
      finish(null);
      return;
    }
    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        requiresOnDeviceRecognition: true,
        interimResults: true,
        continuous: false,
        iosTaskHint: 'dictation',
        audioSource: { uri, audioChannels: 1, sampleRate: 16000, chunkDelayMillis: 30 },
      });
    } catch {
      finish(null);
    }
  });
}

export async function analyseRecordedVoice(
  uri: string,
  job: string,
  signal: AbortSignal,
  onProgress: (fraction: number) => void,
): Promise<VoiceSummary> {
  const release = claimSpeech(job);
  const cancel = () => cancelExtraction(job);
  signal.addEventListener('abort', cancel, { once: true });
  try {
    if (signal.aborted) throw new Error('Cancelled');
    const chunks = await extractAudio(uri, job);
    if (signal.aborted) throw new Error('Cancelled');
    let paceAvailable = false;
    try {
      paceAvailable = await offlineAvailable();
    } catch {}
    let transcript = '',
      duration = 0,
      sumEnergy = 0,
      measured = 0,
      quiet = 0,
      pitchWindow: number[] = [];
    const windows: number[] = [];
    let windowFrames = 0,
      windowDuration = 0;
    for (let index = 0; index < chunks.length; index++) {
      if (signal.aborted) throw new Error('Cancelled');
      const chunk = chunks[index];
      const samples = decodeWav(await new File(chunk.uri).bytes());
      duration += samples.length / 16;
      for (let offset = 0; offset + 1024 <= samples.length; offset += 3200) {
        const value = analyseVoice(samples.subarray(offset, offset + 1024), 16000);
        if (value.db >= FEEDBACK.voicedDb) {
          sumEnergy += 10 ** (value.db / 10);
          measured++;
          if (value.db < FEEDBACK.quietDb) quiet++;
        }
        if (value.pitchHz !== null) pitchWindow.push(value.pitchHz);
        if (windowFrames % 25 === 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          if (signal.aborted) throw new Error('Cancelled');
        }
        windowFrames++;
        windowDuration += 200;
        if (windowDuration >= FEEDBACK.monotoneWindowMs) {
          const variation =
            pitchWindow.length >= windowFrames * 0.5 ? pitchVariation(pitchWindow) : null;
          if (variation !== null) windows.push(variation);
          pitchWindow = [];
          windowDuration = 0;
          windowFrames = 0;
        }
      }
      if (paceAvailable) {
        const recognized = await recognize(chunk.uri, signal);
        if (recognized === null) paceAvailable = false;
        else transcript += ` ${recognized}`;
      }
      if (signal.aborted) throw new Error('Cancelled');
      onProgress((index + 1) / chunks.length);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    const variation = windows.length ? windows.reduce((a, b) => a + b, 0) / windows.length : null;
    return {
      measuredMs: duration,
      meanDb: measured ? 10 * Math.log10(sumEnergy / measured) : null,
      quietPercent: measured ? Math.round((100 * quiet) / measured) : null,
      pitchVariationSemitones: variation,
      monotone: variation === null ? null : variation < FEEDBACK.monotoneSemitones,
      wordsPerMinute: paceAvailable ? wordsPerMinute(transcript, duration) : null,
      paceAvailable,
    };
  } finally {
    signal.removeEventListener('abort', cancel);
    await cleanupAudio(job).catch(() => {});
    release();
  }
}
