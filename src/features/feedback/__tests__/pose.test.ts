import { parsePose, posePointToFrame } from '../pose';

describe('pose coordinate contract', () => {
  it('parses MoveNet y,x,confidence triples', () => {
    const output = new Float32Array(51);
    output.set([0.2, 0.3, 0.9]);
    expect(parsePose(output)[0]).toEqual({
      x: expect.closeTo(0.3),
      y: expect.closeTo(0.2),
      score: expect.closeTo(0.9),
    });
    expect(parsePose(new Float32Array(50))).toEqual([]);
  });
  it.each(['up', 'right', 'down', 'left'] as const)(
    'maps the image centre through %s orientation',
    (orientation) => {
      expect(posePointToFrame({ x: 0.5, y: 0.5 }, 640, 480, orientation, false)).toEqual({
        x: 320,
        y: 240,
      });
    },
  );
  it('undoes padding and mirroring with the resizer shader contract', () => {
    expect(posePointToFrame({ x: 0.25, y: 0.3125 }, 640, 480, 'up', false)).toEqual({
      x: 160,
      y: 120,
    });
    expect(posePointToFrame({ x: 0.25, y: 0.3125 }, 640, 480, 'up', true)).toEqual({
      x: 480,
      y: 120,
    });
  });
});
