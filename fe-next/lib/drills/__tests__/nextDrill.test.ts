/**
 * computeNextDrill — picks the next *unlocked* drill to suggest after a round,
 * so finishing a drill always offers somewhere to keep going (not just
 * Play-Again / Exit).
 *
 * Rules:
 *  - Rotate forward from the current drill through the canonical order, wrapping.
 *  - Skip drills the player hasn't unlocked (gamesPlayed < unlock threshold).
 *  - Never suggest the current drill (that's what "Play Again" is for).
 *  - With unknown/zero games, only the always-unlocked drills are eligible.
 */

import { describe, it, expect } from 'vitest';
import { computeNextDrill, DRILL_ORDER } from '../nextDrill';

describe('computeNextDrill', () => {
  it('suggests the next drill in canonical order when all are unlocked', () => {
    // pattern-switcher (gate 5) and rare-gems (gate 10) require games played.
    expect(computeNextDrill('lightning-round', 100)).toBe('memory-hunt');
    expect(computeNextDrill('memory-hunt', 100)).toBe('combo-master');
    expect(computeNextDrill('combo-master', 100)).toBe('pattern-switcher');
    expect(computeNextDrill('pattern-switcher', 100)).toBe('rare-gems');
  });

  it('wraps around to the start of the order', () => {
    expect(computeNextDrill('rare-gems', 100)).toBe('lightning-round');
  });

  it('skips locked drills (gamesPlayed below their unlock threshold)', () => {
    // 0 games: only lightning/memory/combo are unlocked. From combo-master,
    // pattern-switcher (5) and rare-gems (10) are locked → wrap to lightning.
    expect(computeNextDrill('combo-master', 0)).toBe('lightning-round');
    // From lightning at 0 games → memory-hunt (also gate 0).
    expect(computeNextDrill('lightning-round', 0)).toBe('memory-hunt');
  });

  it('includes pattern-switcher once unlocked but still skips rare-gems below 10', () => {
    // 5 games: pattern unlocked, rare-gems (10) still locked.
    expect(computeNextDrill('combo-master', 5)).toBe('pattern-switcher');
    expect(computeNextDrill('pattern-switcher', 5)).toBe('lightning-round');
  });

  it('never returns the current drill', () => {
    for (const d of DRILL_ORDER) {
      expect(computeNextDrill(d, 100)).not.toBe(d);
      expect(computeNextDrill(d, 0)).not.toBe(d);
    }
  });

  it('treats undefined/negative games as zero (always-unlocked set only)', () => {
    expect(computeNextDrill('combo-master', undefined as unknown as number)).toBe('lightning-round');
    expect(computeNextDrill('lightning-round', -3)).toBe('memory-hunt');
  });
});
