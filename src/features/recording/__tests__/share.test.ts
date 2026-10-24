import * as Sharing from 'expo-sharing';
import { shareRecording } from '../share';

let mockExists = true,
  mockSize = 1024,
  mockExtension = '.mp4';
jest.mock('expo-file-system', () => ({
  File: jest.fn(() => ({ exists: mockExists, size: mockSize, extension: mockExtension })),
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockExists = true;
  mockSize = 1024;
  mockExtension = '.mp4';
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
  jest.mocked(Sharing.shareAsync).mockResolvedValue(undefined);
});

it.each([
  ['.mp4', 'video/mp4', 'public.mpeg-4'],
  ['.MOV', 'video/quicktime', 'com.apple.quicktime-movie'],
])('shares a saved %s file with the correct platform type', async (ext, mimeType, UTI) => {
  mockExtension = ext;
  const uri = `file:///documents/lumi${ext}`;
  expect(await shareRecording(uri)).toBe('opened');
  expect(Sharing.shareAsync).toHaveBeenCalledWith(uri, expect.objectContaining({ mimeType, UTI }));
});
it('does not open a remote, missing or empty video', async () => {
  expect(await shareRecording('https://example.com/video.mp4')).toBe('missing');
  mockExists = false;
  expect(await shareRecording('file:///missing.mp4')).toBe('missing');
  mockExists = true;
  mockSize = 0;
  expect(await shareRecording('file:///empty.mp4')).toBe('missing');
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
});
it('handles unsupported sharing, native failure and a screen left during availability lookup', async () => {
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(false);
  expect(await shareRecording('file:///clip.mp4')).toBe('unavailable');
  expect(await shareRecording('file:///clip.mp4', () => false)).toBe('cancelled');
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
  jest.mocked(Sharing.shareAsync).mockRejectedValueOnce(new Error('native error'));
  expect(await shareRecording('file:///clip.mp4')).toBe('failed');
});
