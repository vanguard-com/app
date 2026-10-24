import * as MediaLibrary from 'expo-media-library/legacy';

import { saveToPhotos } from '../files';
import { useSettings } from '@/store/settingsStore';

jest.mock('@/cues', () => ({ speakAndWait: jest.fn(async () => {}) }));
jest.mock('expo-file-system', () => ({
  Directory: jest.fn(),
  File: jest.fn(),
  Paths: { document: 'file:///documents/' },
}));

describe('photo saving fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettings.getState().reset();
  });
  it('does not automatically re-prompt a reviewed Photos choice, but allows explicit Save retry', async () => {
    useSettings.getState().update({ permissionsReviewed: true });
    jest
      .mocked(MediaLibrary.getPermissionsAsync)
      .mockResolvedValueOnce({ granted: false, canAskAgain: true } as Awaited<
        ReturnType<typeof MediaLibrary.getPermissionsAsync>
      >);
    expect(await saveToPhotos('file:///video.mp4')).toBe('denied');
    expect(MediaLibrary.requestPermissionsAsync).not.toHaveBeenCalled();
    jest
      .mocked(MediaLibrary.getPermissionsAsync)
      .mockResolvedValueOnce({ granted: false, canAskAgain: true } as Awaited<
        ReturnType<typeof MediaLibrary.getPermissionsAsync>
      >);
    expect(await saveToPhotos('file:///video.mp4', true)).toBe('saved');
    expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalledWith(true);
  });
  it('saves with add-only permission', async () => {
    expect(await saveToPhotos('file:///video.mp4')).toBe('saved');
    expect(MediaLibrary.getPermissionsAsync).toHaveBeenCalledWith(true);
    expect(MediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith('file:///video.mp4');
  });
  it('does not request or save Photos for an abandoned recording screen', async () => {
    const controller = new AbortController();
    controller.abort();
    expect(await saveToPhotos('file:///video.mp4', false, controller.signal)).toBe('denied');
    expect(MediaLibrary.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(MediaLibrary.saveToLibraryAsync).not.toHaveBeenCalled();
  });
  it('does not save if focus is lost while existing access is checked', async () => {
    const controller = new AbortController();
    jest.mocked(MediaLibrary.getPermissionsAsync).mockImplementationOnce(async () => {
      controller.abort();
      return { granted: true, canAskAgain: true } as Awaited<
        ReturnType<typeof MediaLibrary.getPermissionsAsync>
      >;
    });
    expect(await saveToPhotos('file:///video.mp4', false, controller.signal)).toBe('denied');
    expect(MediaLibrary.saveToLibraryAsync).not.toHaveBeenCalled();
  });
  it('finishes saving when the user grants an already displayed native dialog despite app deactivation', async () => {
    const controller = new AbortController();
    jest
      .mocked(MediaLibrary.getPermissionsAsync)
      .mockResolvedValueOnce({ granted: false, canAskAgain: true } as Awaited<
        ReturnType<typeof MediaLibrary.getPermissionsAsync>
      >);
    jest.mocked(MediaLibrary.requestPermissionsAsync).mockImplementationOnce(async () => {
      controller.abort();
      return { granted: true, canAskAgain: true } as Awaited<
        ReturnType<typeof MediaLibrary.requestPermissionsAsync>
      >;
    });
    expect(await saveToPhotos('file:///video.mp4', true, controller.signal)).toBe('saved');
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
