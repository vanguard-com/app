import { useRecordingHistory } from '../recordingHistory';

describe('local recording feedback history', () => {
  beforeEach(() => useRecordingHistory.setState({ recordings: [] }));
  it('keeps only the last 20 recordings and updates an existing recording without duplication', () => {
    for (let i = 0; i < 25; i++)
      useRecordingHistory.getState().remember({
        uri: `file:///${i}.mp4`,
        durationMs: 1000,
        hasAudio: true,
        savedToPhotos: false,
      });
    expect(useRecordingHistory.getState().recordings).toHaveLength(20);
    expect(useRecordingHistory.getState().recordings[0].uri).toBe('file:///24.mp4');
    const info = useRecordingHistory.getState().recordings[0];
    useRecordingHistory.getState().remember({ ...info, savedToPhotos: true });
    expect(useRecordingHistory.getState().recordings).toHaveLength(20);
    expect(useRecordingHistory.getState().recordings[0].savedToPhotos).toBe(true);
    useRecordingHistory.getState().forget(info.uri);
    expect(useRecordingHistory.getState().recordings.some((r) => r.uri === info.uri)).toBe(false);
  });
});
