import { describe, expect, it } from 'vitest';
import { pickMiniCelebration } from '../miniCelebration';

describe('pickMiniCelebration', () => {
  const base = { tier: 'soft' as const, streak: 0, cellsStolen: 0 };

  it('fires nothing for a small ordinary word with no streak or steal', () => {
    expect(pickMiniCelebration({ ...base, tier: 'soft' })).toBeNull();
    expect(pickMiniCelebration({ ...base, tier: 'nice' })).toBeNull();
  });

  it('does NOT double-fire on a bingo (the dedicated bingo burst already covers it)', () => {
    expect(pickMiniCelebration({ ...base, tier: 'bingo' })).toBeNull();
    expect(pickMiniCelebration({ tier: 'bingo', streak: 9, cellsStolen: 9 })).toBeNull();
  });

  it('pops a mini burst for a big (great/huge) non-bingo word', () => {
    expect(pickMiniCelebration({ ...base, tier: 'great' })).toBe('great');
    expect(pickMiniCelebration({ ...base, tier: 'huge' })).toBe('great');
  });

  it('pops a mini burst when stealing 2+ rival squares (the core Conquest thrill)', () => {
    expect(pickMiniCelebration({ ...base, cellsStolen: 1 })).toBeNull();
    expect(pickMiniCelebration({ ...base, cellsStolen: 2 })).toBe('great');
    expect(pickMiniCelebration({ ...base, cellsStolen: 5 })).toBe('great');
  });

  it('pops a mini burst on a streak milestone (every other word from 3 up)', () => {
    expect(pickMiniCelebration({ ...base, streak: 2 })).toBeNull();
    expect(pickMiniCelebration({ ...base, streak: 3 })).toBe('great');
    expect(pickMiniCelebration({ ...base, streak: 4 })).toBeNull();
    expect(pickMiniCelebration({ ...base, streak: 5 })).toBe('great');
  });
});
