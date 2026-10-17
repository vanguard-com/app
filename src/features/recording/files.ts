import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library/legacy';

import { speakAndWait } from '@/cues';
import { strings } from '@/i18n';

// Recordings live in the app's documents folder until saved to Photos or retaken.
const RECORDINGS_DIR = 'recordings';

function toUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

/** Move a finished recording from the camera's temp folder into Lumi's storage. */
export function keepRecording(tempPath: string, now = new Date()): string {
  const dir = new Directory(Paths.document, RECORDINGS_DIR);
  dir.create({ intermediates: true, idempotent: true });
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const file = new File(toUri(tempPath));
  const extension = file.extension || '.mp4';
  const target = new File(dir, `lumi-${stamp}${extension}`);
  file.move(target);
  return target.uri;
}

export function deleteRecording(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('Could not delete recording', error);
  }
}

export type SaveResult = 'saved' | 'denied' | 'failed';

/** Save to the phone's photo library. Asks for add-only access the first time. */
export async function saveToPhotos(uri: string): Promise<SaveResult> {
  try {
    const current = await MediaLibrary.getPermissionsAsync(true);
    if (!current.granted && current.canAskAgain)
      await speakAndWait(strings.permissions.photos.explain, 'perm.photos.explain');
    const permission =
      current.granted || !current.canAskAgain
        ? current
        : await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) return 'denied';
    await MediaLibrary.saveToLibraryAsync(uri);
    return 'saved';
  } catch (error) {
    console.warn('Could not save to Photos', error);
    return 'failed';
  }
}
