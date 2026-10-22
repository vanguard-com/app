import { requireOptionalNativeModule } from 'expo-modules-core';

export interface AudioChunk {
  uri: string;
  durationMs: number;
  sampleRate: number;
}
interface AudioAnalysisNative {
  extract(uri: string, job: string): Promise<AudioChunk[]>;
  cancel(job: string): void;
  cleanup(job: string): Promise<void>;
}
const native = requireOptionalNativeModule<AudioAnalysisNative>('LumiAudioAnalysis');
export async function extractAudio(uri: string, job: string): Promise<AudioChunk[]> {
  if (!native) throw new Error('Rebuild the native app for voice analysis');
  return native.extract(uri, job);
}
export function cancelExtraction(job: string) {
  native?.cancel(job);
}
export async function cleanupAudio(job: string) {
  await native?.cleanup(job);
}
