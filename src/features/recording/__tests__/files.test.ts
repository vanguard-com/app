import * as MediaLibrary from 'expo-media-library/legacy';

import { saveToPhotos } from '../files';

jest.mock('@/cues', () => ({ speakAndWait: jest.fn(async () => {}) }));
jest.mock('expo-file-system', () => ({
  Directory: jest.fn(),
  File: jest.fn(),
  Paths: { document: 'file:///documents/' },
}));

describe('photo saving fallback', () => {
  beforeEach(() => jest.clearAllMocks());
  it('saves with add-only permission', async () => {
    expect(await saveToPhotos('file:///video.mp4')).toBe('saved');
    expect(MediaLibrary.getPermissionsAsync).toHaveBeenCalledWith(true);
    expect(MediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith('file:///video.mp4');
  });
  it('does not attempt a save when access is denied', async () => {
    jest
      .mocked(MediaLibrary.getPermissionsAsync)
      .mockResolvedValueOnce({ granted: false, canAskAgain: false } as Awaited<
        ReturnType<typeof MediaLibrary.getPermissionsAsync>
      >);
    expect(await saveToPhotos('file:///video.mp4')).toBe('denied');
    expect(MediaLibrary.saveToLibraryAsync).not.toHaveBeenCalled();
  });
  it('returns a retryable failure if permission lookup throws', async () => {
    jest
      .mocked(MediaLibrary.getPermissionsAsync)
      .mockRejectedValueOnce(new Error('permission API unavailable'));
    expect(await saveToPhotos('file:///video.mp4')).toBe('failed');
  });
});
