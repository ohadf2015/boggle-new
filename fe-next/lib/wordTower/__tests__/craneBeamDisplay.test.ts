import { describe, it, expect } from 'vitest';
import { craneBeamBricks, CRANE_BEAM_MAX_BRICKS } from '../craneBeamDisplay';

describe('craneBeamBricks — cap the carried girder to a few bricks', () => {
  it('shows every letter when the word fits the cap (no overflow)', () => {
    const { chars, hiddenCount } = craneBeamBricks('CAT');
    expect(chars).toEqual(['C', 'A', 'T']);
    expect(hiddenCount).toBe(0);
  });

  it('caps a long word to the max bricks and reports the hidden remainder', () => {
    const { chars, hiddenCount } = craneBeamBricks('CONIFER'); // 7 letters
    expect(chars.length).toBe(CRANE_BEAM_MAX_BRICKS);
    expect(chars).toEqual(['C', 'O', 'N']); // first N letters, base→top
    expect(hiddenCount).toBe(7 - CRANE_BEAM_MAX_BRICKS);
  });

  it('never returns more bricks than the cap, for any length', () => {
    for (let n = 0; n <= 20; n++) {
      const word = 'A'.repeat(n);
      const { chars } = craneBeamBricks(word);
      expect(chars.length).toBeLessThanOrEqual(CRANE_BEAM_MAX_BRICKS);
    }
  });

  it('preserves letter order (base = word[0])', () => {
    expect(craneBeamBricks('TOWER').chars[0]).toBe('T');
  });

  it('handles empty / nullish input gracefully', () => {
    expect(craneBeamBricks('')).toEqual({ chars: [], hiddenCount: 0 });
    // @ts-expect-error guarding runtime nullish
    expect(craneBeamBricks(undefined)).toEqual({ chars: [], hiddenCount: 0 });
  });

  it('respects a custom cap', () => {
    const { chars, hiddenCount } = craneBeamBricks('TOWER', 2);
    expect(chars).toEqual(['T', 'O']);
    expect(hiddenCount).toBe(3);
  });

  it('hiddenCount + visible always equals the full length', () => {
    const word = 'SKYSCRAPER';
    const { chars, hiddenCount } = craneBeamBricks(word);
    expect(chars.length + hiddenCount).toBe(word.length);
  });
});
