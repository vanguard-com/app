import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { strings } from '@/i18n';

export type ShareResult = 'opened' | 'missing' | 'unavailable' | 'failed' | 'cancelled';

/** Export only an existing local recording; the system grants the receiving app file access. */
export async function shareRecording(
  uri: string,
  canOpen: () => boolean = () => true,
): Promise<ShareResult> {
  try {
    if (!uri.startsWith('file://')) return 'missing';
    const file = new File(uri);
    if (!file.exists || file.size <= 0) return 'missing';
    const extension = file.extension.toLowerCase();
    if (extension !== '.mp4' && extension !== '.mov') return 'failed';
    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
    if (!canOpen()) return 'cancelled';
    await Sharing.shareAsync(uri, {
      mimeType: extension === '.mov' ? 'video/quicktime' : 'video/mp4',
      UTI: extension === '.mov' ? 'com.apple.quicktime-movie' : 'public.mpeg-4',
      dialogTitle: strings.review.shareTitle,
    });
    // The OS does not tell us whether the receiving app uploaded or the user cancelled.
    return 'opened';
  } catch {
    return 'failed';
  }
}
