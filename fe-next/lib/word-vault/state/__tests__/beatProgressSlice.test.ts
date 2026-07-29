// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createBeatProgressSlice } from '../beatProgressSlice';

describe('beatProgressSlice', () => {
  it('isSolved is false by default', () => {
    const s = createBeatProgressSlice();
    expect(s.isSolved('r1.1', 'open-door')).toBe(false);
  });

  it('markSolved persists across reads', () => {
    const s = createBeatProgressSlice();
    s.markSolved('r1.1', 'open-door');
    expect(s.isSolved('r1.1', 'open-door')).toBe(true);
  });

  it('solvedBeats lists per-room ids', () => {
    const s = createBeatProgressSlice();
    s.markSolved('r1.1', 'open-door');
    s.markSolved('r1.4', 'thaw');
    s.markSolved('r1.4', 'fuel');
    expect(s.solvedBeats('r1.4').sort()).toEqual(['fuel', 'thaw']);
  });

  it('clearRoom wipes that room only', () => {
    const s = createBeatProgressSlice();
    s.markSolved('r1.1', 'a'); s.markSolved('r1.4', 'b');
    s.clearRoom('r1.1');
    expect(s.isSolved('r1.1', 'a')).toBe(false);
    expect(s.isSolved('r1.4', 'b')).toBe(true);
  });
});
