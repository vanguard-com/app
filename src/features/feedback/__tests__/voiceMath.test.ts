import { analyseVoice, pitchVariation, wordsPerMinute } from '../voiceMath';
import { decodeWav } from '../recordedVoice';

const sine = (frequency: number, amp = 0.2) =>
  Float32Array.from(
    { length: 1024 },
    (_, i) => amp * Math.sin((2 * Math.PI * frequency * i) / 16000),
  );
describe('voice measurements', () => {
  it.each([100, 200, 400])('estimates pitch of a %s Hz synthetic signal', (frequency) => {
    const result = analyseVoice(sine(frequency), 16000);
    expect(result.pitchHz).toBeCloseTo(frequency, 0);
    expect(result.db).toBeCloseTo(-16.99, 1);
  });
  it('does not invent pitch from silence or a constant DC offset', () => {
    expect(analyseVoice(new Float32Array(1024), 16000).pitchHz).toBeNull();
    expect(analyseVoice(new Float32Array(1024).fill(0.5), 16000).pitchHz).toBeNull();
    expect(analyseVoice(new Float32Array([NaN]), 16000).pitchHz).toBeNull();
  });
  it('separates quiet speech-like audio from normal levels', () => {
    expect(analyseVoice(sine(200, 0.015), 16000).db).toBeLessThan(-35);
    expect(analyseVoice(sine(200), 16000).db).toBeGreaterThan(-35);
  });
  it('uses pitch variation in semitones and requires enough samples', () => {
    expect(pitchVariation(Array(50).fill(200))).toBeCloseTo(0);
    expect(pitchVariation(Array.from({ length: 50 }, (_, i) => (i % 2 ? 100 : 200)))).toBeCloseTo(
      6,
    );
    expect(pitchVariation([200])).toBeNull();
  });
  it('computes speaking pace from the latest transcript and real duration', () => {
    expect(wordsPerMinute('one two three four five', 2000)).toBeNull();
    expect(wordsPerMinute(Array(150).fill('word').join(' '), 60000)).toBe(150);
    expect(wordsPerMinute('', 60000)).toBeNull();
  });
  it('decodes only valid mono 16 kHz 16-bit WAV chunks', () => {
    const buffer = new ArrayBuffer(48),
      bytes = new Uint8Array(buffer),
      view = new DataView(buffer);
    const ascii = (at: number, s: string) =>
      [...s].forEach((v, i) => (bytes[at + i] = v.charCodeAt(0)));
    ascii(0, 'RIFF');
    ascii(8, 'WAVE');
    ascii(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true);
    view.setUint16(34, 16, true);
    ascii(36, 'data');
    view.setUint32(40, 4, true);
    view.setInt16(44, 16384, true);
    view.setInt16(46, -16384, true);
    expect(Array.from(decodeWav(bytes))).toEqual([0.5, -0.5]);
    expect(() => decodeWav(bytes.subarray(0, 46))).toThrow('Truncated');
    view.setUint16(22, 2, true);
    expect(() => decodeWav(bytes)).toThrow('Unsupported');
  });
});
