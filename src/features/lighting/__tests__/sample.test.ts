import { sampleLuma } from '../sample';

const bytes = new Uint8Array([10, 20, 30, 40, 99, 99, 50, 60, 70, 80]);
describe('native luminance sampling', () => {
  it('respects row stride and visible crop', () => {
    expect(
      sampleLuma(bytes, 4, 2, 6, { x: 1, y: 0 }, { x: 3, y: 0 }, { x: 1, y: 2 }, 2, false),
    ).toEqual([20, 30, 60, 70]);
  });
  it('mirrors the grid when native preview conversion reverses x', () => {
    expect(
      sampleLuma(bytes, 4, 2, 6, { x: 4, y: 0 }, { x: 0, y: 0 }, { x: 4, y: 2 }, 2, false),
    ).toEqual([40, 20, 80, 60]);
  });
  it('follows native rotation mapping', () => {
    expect(
      sampleLuma(bytes, 4, 2, 6, { x: 0, y: 2 }, { x: 0, y: 0 }, { x: 4, y: 2 }, 2, false),
    ).toEqual([60, 20, 80, 40]);
  });
  it('expands video range to 0–255', () => {
    expect(
      sampleLuma(
        new Uint8Array([16, 235, 16, 235]),
        2,
        2,
        2,
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 2 },
        2,
        true,
      ),
    ).toEqual([0, 255, 0, 255]);
  });
  it('rejects truncated buffers and invalid mapping rather than reading unrelated memory', () => {
    expect(
      sampleLuma(bytes, 4, 3, 6, { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 }, 2, false),
    ).toEqual([]);
    expect(
      sampleLuma(bytes, 4, 2, 6, { x: -10, y: 0 }, { x: 4, y: 0 }, { x: -10, y: 2 }, 2, false),
    ).toEqual([]);
  });
});
