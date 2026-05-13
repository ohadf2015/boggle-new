import { describe, it, expect } from 'vitest';
import { chordForTier } from '../chain-chord';

describe('chordForTier', () => {
  it('small tier: single high tone (E5 pentatonic), short', () => {
    const c = chordForTier('small');
    expect(c.notes).toHaveLength(1);
    expect(c.notes[0]!).toBeGreaterThan(600);
    expect(c.notes[0]!).toBeLessThan(700);
    expect(c.noteDurationMs).toBeLessThanOrEqual(200);
  });

  it('big tier: 3-note ascending arpeggio', () => {
    const c = chordForTier('big');
    expect(c.notes).toHaveLength(3);
    // strictly ascending
    expect(c.notes[1]!).toBeGreaterThan(c.notes[0]!);
    expect(c.notes[2]!).toBeGreaterThan(c.notes[1]!);
  });

  it('mega tier: 5-note ascending arpeggio', () => {
    const c = chordForTier('mega');
    expect(c.notes).toHaveLength(5);
    expect(c.notes[4]!).toBeGreaterThan(c.notes[0]!);
  });

  it('none tier: empty (no audio)', () => {
    const c = chordForTier('none');
    expect(c.notes).toEqual([]);
  });

  it('total duration scales with tier intensity', () => {
    const small = chordForTier('small');
    const big = chordForTier('big');
    const mega = chordForTier('mega');
    const totalDur = (c: { notes: number[]; noteDurationMs: number }) => c.notes.length * c.noteDurationMs;
    expect(totalDur(big)).toBeGreaterThan(totalDur(small));
    expect(totalDur(mega)).toBeGreaterThan(totalDur(big));
  });
});
