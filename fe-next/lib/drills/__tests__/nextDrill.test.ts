/**
 * computeNextDrill — picks the next drill to suggest after a round, so
 * finishing a drill always offers somewhere to keep going.
 *
 * v2: pattern-switcher retired; every live drill is unlocked from game 0.
 */

import { describe, it, expect } from 'vitest';
import { computeNextDrill, DRILL_ORDER } from '../nextDrill';

describe('computeNextDrill', () => {
  it('suggests the next drill in canonical order', () => {
    expect(computeNextDrill('lightning-round', 0)).toBe('memory-hunt');
    expect(computeNextDrill('memory-hunt', 0)).toBe('combo-master');
    expect(computeNextDrill('combo-master', 0)).toBe('rare-gems');
  });

  it('wraps around to the start of the order', () => {
    expect(computeNextDrill('rare-gems', 0)).toBe('lightning-round');
  });

  it('never suggests the retired pattern-switcher', () => {
    expect(DRILL_ORDER).not.toContain('pattern-switcher');
    for (const d of DRILL_ORDER) expect(computeNextDrill(d, 100)).not.toBe('pattern-switcher');
  });

  it('never returns the current drill', () => {
    for (const d of DRILL_ORDER) {
      expect(computeNextDrill(d, 100)).not.toBe(d);
      expect(computeNextDrill(d, 0)).not.toBe(d);
    }
  });

  it('treats undefined/negative games as zero', () => {
    expect(computeNextDrill('combo-master', undefined as unknown as number)).toBe('rare-gems');
    expect(computeNextDrill('lightning-round', -3)).toBe('memory-hunt');
  });
});
