import { angleDelta, LightScan } from '../scan';

function sweep(scan: LightScan, direction = 1, uniform = false) {
  scan.start(0);
  for (let i = 0; i <= 35; i++) {
    const heading = direction * i * 10;
    scan.heading(heading, i * 500);
    scan.sample(uniform ? 100 : i === 9 ? 200 : 70, i * 500);
  }
}

describe('light scan', () => {
  it.each([
    [10, 350, 20],
    [350, 10, -20],
    [-170, 170, 20],
    [90, 180, -90],
  ])('wraps shortest direction %s,%s', (target, current, expected) =>
    expect(angleDelta(target, current)).toBe(expected),
  );
  it.each([1, -1])('finds a brighter bin in either sweep direction %s', (direction) => {
    const scan = new LightScan();
    sweep(scan, direction);
    expect(scan.result.phase).toBe('guiding');
    expect(Math.abs(scan.result.turn)).toBeLessThanOrEqual(180);
    scan.heading(direction * 370, 18_000);
    // Return gradually to the brightest direction without an implausible sensor jump.
    const target = direction === 1 ? 95 : -85;
    let current = direction * 370;
    let now = 18_100;
    while (Math.abs(angleDelta(target, current)) > 10) {
      current += Math.sign(angleDelta(target, current)) * 10;
      scan.heading(current, now);
      now += 100;
    }
    scan.heading(current, now + 800);
    expect(scan.result.phase).toBe('done');
  });
  it('does not count repeated rocking as a circle', () => {
    const scan = new LightScan();
    scan.start(0);
    for (let i = 0; i < 100; i++) {
      scan.heading(i % 2 ? 20 : 0, i * 100);
      scan.sample(120, i * 100);
    }
    expect(scan.result.phase).toBe('scanning');
    expect(scan.result.progress).toBeLessThan(0.1);
  });
  it('requires light samples as well as sensor coverage', () => {
    const scan = new LightScan();
    scan.start(0);
    for (let i = 0; i < 36; i++) scan.heading(i * 10, i * 100);
    expect(scan.result.phase).toBe('scanning');
    expect(scan.result.progress).toBe(0);
  });
  it('fails on uniform brightness rather than inventing a best direction', () => {
    const scan = new LightScan();
    sweep(scan, 1, true);
    expect(scan.result.phase).toBe('failed');
  });
  it('rejects a sensor reset', () => {
    const scan = new LightScan();
    scan.start(0);
    scan.heading(0, 0);
    scan.heading(100, 50);
    expect(scan.result.phase).toBe('failed');
  });
  it('stops when the sensor stalls or the scan times out', () => {
    const scan = new LightScan();
    scan.start(0);
    scan.heading(0, 0);
    expect(scan.tick(2500).phase).toBe('failed');
    scan.start(0);
    scan.heading(0, 90_100);
    expect(scan.tick(90_100).phase).toBe('failed');
  });
  it('ignores stale brightness and clears all state on cancel/restart', () => {
    const scan = new LightScan();
    scan.start(0);
    scan.heading(0, 0);
    scan.sample(200, 500);
    expect(scan.result.progress).toBe(0);
    scan.cancel();
    expect(scan.result.phase).toBe('idle');
    scan.start(1000);
    expect(scan.result.progress).toBe(0);
  });
});
