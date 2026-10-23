import { requireOptionalNativeModule } from 'expo-modules-core';
interface NativeModelFiles {
  prepare(uri: string): Promise<void>;
  sha256(uri: string, job: string): Promise<string>;
  cancel(job: string): void;
}
const native = requireOptionalNativeModule<NativeModelFiles>('LumiModelFiles');
export function prepareModelDirectory(uri: string) {
  if (!native) throw new Error('Model verification requires a native build');
  return native.prepare(uri);
}
export function hashModelFile(uri: string, job: string) {
  if (!native) throw new Error('Model verification requires a native build');
  return native.sha256(uri, job);
}
export function cancelModelHash(job: string) {
  native?.cancel(job);
}
