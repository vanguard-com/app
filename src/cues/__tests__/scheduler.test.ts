import { CueScheduler } from '@/cues/scheduler';
import type { Cue } from '@/cues/types';

const cue = (overrides: Partial<Cue> & Pick<Cue, 'id' | 'category'>): Cue => ({
  text: overrides.id,
  ...overrides,
});

describe('CueScheduler priority', () => {
  it('delivers system, framing, lighting, background, feedback in that order', () => {
    const s = new CueScheduler({ verbosity: 'detailed' });
    s.enqueue(cue({ id: 'f', category: 'feedback', text: undefined, haptic: 'single' }), 0);
    s.enqueue(cue({ id: 'b', category: 'background', text: undefined, haptic: 'single' }), 0);
    s.enqueue(cue({ id: 'l', category: 'lighting', text: undefined, haptic: 'single' }), 0);
    s.enqueue(cue({ id: 'fr', category: 'framing', text: undefined, haptic: 'single' }), 0);
    s.enqueue(cue({ id: 's', category: 'system', text: undefined, haptic: 'single' }), 0);
    const order = [1, 2, 3, 4, 5].map(() => s.next(0, false)?.id);
    expect(order).toEqual(['s', 'fr', 'l', 'b', 'f']);
  });

  it('keeps only the latest waiting guidance per category', () => {
    const s = new CueScheduler();
    s.enqueue(cue({ id: 'framing.left', category: 'framing' }), 0);
    s.enqueue(cue({ id: 'framing.up', category: 'framing' }), 100);
    expect(s.pendingCount).toBe(1);
    expect(s.next(100, false)?.id).toBe('framing.up');
  });

  it('queues system cues in order instead of replacing them', () => {
    const s = new CueScheduler();
    s.enqueue(cue({ id: 'sys.recording', category: 'system' }), 0);
    s.enqueue(cue({ id: 'sys.30s', category: 'system' }), 0);
    expect(s.next(0, false)?.id).toBe('sys.recording');
    expect(s.next(0, false)?.id).toBe('sys.30s');
  });

  it('never starts an audio cue while audio is busy, but lets silent haptic cues through', () => {
    const s = new CueScheduler();
    s.enqueue(cue({ id: 'spoken', category: 'framing' }), 0);
    s.enqueue(cue({ id: 'buzz', category: 'lighting', text: undefined, haptic: 'double' }), 0);
    expect(s.next(0, true)?.id).toBe('buzz');
    expect(s.next(0, true)).toBeNull();
    expect(s.next(0, false)?.id).toBe('spoken');
  });
});

describe('CueScheduler rate limit', () => {
  it.each([
    ['minimal', 5000],
    ['standard', 3000],
    ['detailed', 2000],
  ] as const)('%s allows one spoken guidance cue per %i ms', (verbosity, gap) => {
    const s = new CueScheduler({ verbosity });
    s.enqueue(cue({ id: 'a', category: 'framing' }), 0);
    expect(s.next(0, false)?.id).toBe('a');

    s.enqueue(cue({ id: 'b', category: 'lighting', maxWaitMs: 10_000 }), 10);
    expect(s.next(gap - 1, false)).toBeNull();
    expect(s.nextEligibleAt(gap - 1)).toBe(gap);
    expect(s.next(gap, false)?.id).toBe('b');
  });

  it('does not rate limit system cues or user requested (forced) cues', () => {
    const s = new CueScheduler();
    s.enqueue(cue({ id: 'a', category: 'framing' }), 0);
    s.next(0, false);
    s.enqueue(cue({ id: 'sys', category: 'system' }), 100);
    expect(s.next(100, false)?.id).toBe('sys');
    s.enqueue(cue({ id: 'status', category: 'framing', force: true }), 200);
    expect(s.next(200, false)?.id).toBe('status');
  });

  it('counts system speech towards the gap before the next guidance cue', () => {
    const s = new CueScheduler();
    s.enqueue(cue({ id: 'sys', category: 'system' }), 0);
    s.next(0, false);
    s.enqueue(cue({ id: 'guide', category: 'framing' }), 0);
    expect(s.next(2999, false)).toBeNull();
    expect(s.next(3000, false)?.id).toBe('guide');
  });

  it('applies a verbosity change immediately', () => {
    const s = new CueScheduler({ verbosity: 'minimal' });
    s.enqueue(cue({ id: 'a', category: 'framing' }), 0);
    s.next(0, false);
    s.setVerbosity('detailed');
    s.enqueue(cue({ id: 'b', category: 'lighting' }), 2000);
    expect(s.next(2000, false)?.id).toBe('b');
  });
});

describe('CueScheduler repeat rule', () => {
  it('drops the same cue within 10 seconds when nothing changed', () => {
    const s = new CueScheduler({ verbosity: 'detailed' });
    s.enqueue(cue({ id: 'framing.left', category: 'framing' }), 0);
    s.next(0, false);
    expect(s.enqueue(cue({ id: 'framing.left', category: 'framing' }), 5000)).toBe(false);
    expect(s.enqueue(cue({ id: 'framing.left', category: 'framing' }), 9999)).toBe(false);
    expect(s.enqueue(cue({ id: 'framing.left', category: 'framing' }), 10_000)).toBe(true);
  });

  it('allows a repeat inside 10 seconds once the state changed in between', () => {
    const s = new CueScheduler({ verbosity: 'detailed' });
    s.enqueue(cue({ id: 'framing.left', category: 'framing' }), 0);
    s.next(0, false);
    s.enqueue(cue({ id: 'framing.centred', category: 'framing', text: undefined }), 2000);
    s.next(2000, false);
    expect(s.enqueue(cue({ id: 'framing.left', category: 'framing' }), 4000)).toBe(true);
  });

  it('a state change in another category does not unlock a repeat', () => {
    const s = new CueScheduler({ verbosity: 'detailed' });
    s.enqueue(cue({ id: 'framing.left', category: 'framing' }), 0);
    s.next(0, false);
    s.enqueue(cue({ id: 'lighting.dark', category: 'lighting' }), 1000);
    expect(s.enqueue(cue({ id: 'framing.left', category: 'framing' }), 4000)).toBe(false);
  });

  it('says "all good" cues once and stays silent until the state changes', () => {
    const s = new CueScheduler({ verbosity: 'detailed' });
    const good = cue({ id: 'lighting.good', category: 'lighting', silentUntilChange: true });
    s.enqueue(good, 0);
    s.next(0, false);
    expect(s.enqueue(good, 60_000)).toBe(false);
    s.enqueue(cue({ id: 'lighting.dark', category: 'lighting' }), 61_000);
    expect(s.enqueue(good, 62_000)).toBe(true);
  });

  it('lets forced cues repeat at any time', () => {
    const s = new CueScheduler();
    const status = cue({ id: 'status', category: 'system', force: true });
    s.enqueue(status, 0);
    s.next(0, false);
    expect(s.enqueue(status, 500)).toBe(true);
  });
});

describe('CueScheduler staleness and clearing', () => {
  it('drops guidance that waited too long, keeps system cues', () => {
    const s = new CueScheduler();
    s.enqueue(cue({ id: 'guide', category: 'framing', maxWaitMs: 1000 }), 0);
    s.enqueue(cue({ id: 'sys', category: 'system' }), 0);
    expect(s.next(5000, true)).toBeNull();
    expect(s.next(5000, false)?.id).toBe('sys');
    expect(s.next(5000, false)).toBeNull();
  });

  it('clears one category or everything', () => {
    const s = new CueScheduler();
    s.enqueue(cue({ id: 'a', category: 'framing' }), 0);
    s.enqueue(cue({ id: 'b', category: 'lighting' }), 0);
    s.clear('framing');
    expect(s.pendingCount).toBe(1);
    s.clear();
    expect(s.pendingCount).toBe(0);
  });
});
