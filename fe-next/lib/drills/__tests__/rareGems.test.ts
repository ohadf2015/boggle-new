import { describe, it, expect } from 'vitest';
import {
  classifyGem,
  GEM_POINTS,
  gemValue,
  isRareGem,
  computeGemProgress,
  celebrationFor,
  rollLuckyGem,
  LUCKY_GEM_CHANCE,
  LUCKY_GEM_MULTIPLIER,
} from '../rareGems';

describe('classifyGem — length → gem tier (transparent rule)', () => {
  it('3 letters or fewer = common', () => {
    expect(classifyGem('cat')).toBe('common');
    expect(classifyGem('go')).toBe('common');
  });
  it('4 letters = uncommon', () => {
    expect(classifyGem('word')).toBe('uncommon');
  });
  it('5 letters = rare', () => {
    expect(classifyGem('beast')).toBe('rare');
  });
  it('6+ letters = legendary', () => {
    expect(classifyGem('legend')).toBe('legendary');
    expect(classifyGem('quixotic')).toBe('legendary');
  });
});

describe('gem values', () => {
  it('escalate by tier', () => {
    expect(GEM_POINTS.common).toBe(10);
    expect(GEM_POINTS.uncommon).toBe(25);
    expect(GEM_POINTS.rare).toBe(50);
    expect(GEM_POINTS.legendary).toBe(100);
  });
  it('gemValue reads the table', () => {
    expect(gemValue('rare')).toBe(50);
    expect(gemValue('legendary')).toBe(100);
  });
});

describe('isRareGem — what counts toward the goal', () => {
  it('rare and legendary count', () => {
    expect(isRareGem('rare')).toBe(true);
    expect(isRareGem('legendary')).toBe(true);
  });
  it('common and uncommon do not', () => {
    expect(isRareGem('common')).toBe(false);
    expect(isRareGem('uncommon')).toBe(false);
  });
});

describe('computeGemProgress — the pouch meter', () => {
  it('counts rare gems toward target and all gems in the haul', () => {
    const words = [
      { rarity: 'common' },
      { rarity: 'rare' },
      { rarity: 'legendary' },
      { rarity: 'uncommon' },
    ];
    const p = computeGemProgress(words, 3);
    expect(p.rareCount).toBe(2);
    expect(p.totalGems).toBe(4);
    expect(p.target).toBe(3);
    expect(p.complete).toBe(false);
  });

  it('fraction is rareCount/target, clamped to [0,1]', () => {
    expect(computeGemProgress([{ rarity: 'rare' }], 4).fraction).toBeCloseTo(0.25);
    const over = computeGemProgress(
      [{ rarity: 'rare' }, { rarity: 'rare' }, { rarity: 'legendary' }],
      2,
    );
    expect(over.fraction).toBe(1); // clamped, not 1.5
  });

  it('complete when rareCount reaches target', () => {
    const words = [{ rarity: 'rare' }, { rarity: 'legendary' }, { rarity: 'rare' }];
    expect(computeGemProgress(words, 3).complete).toBe(true);
  });

  it('guards a zero/negative target without dividing by zero', () => {
    const p = computeGemProgress([{ rarity: 'rare' }], 0);
    expect(p.fraction).toBe(0);
    expect(Number.isFinite(p.fraction)).toBe(true);
  });

  it('empty haul → zeroed progress', () => {
    const p = computeGemProgress([], 5);
    expect(p.rareCount).toBe(0);
    expect(p.totalGems).toBe(0);
    expect(p.fraction).toBe(0);
    expect(p.complete).toBe(false);
  });
});

describe('celebrationFor — escalating juice by tier', () => {
  it('maps each tier to an intensity', () => {
    expect(celebrationFor('common')).toBe('small');
    expect(celebrationFor('uncommon')).toBe('medium');
    expect(celebrationFor('rare')).toBe('big');
    expect(celebrationFor('legendary')).toBe('epic');
  });
});

describe('rollLuckyGem — variable-reward surprise, independent of tier', () => {
  it('rolls true when rng lands below the chance threshold', () => {
    expect(rollLuckyGem(() => 0)).toBe(true);
    expect(rollLuckyGem(() => LUCKY_GEM_CHANCE - 0.001)).toBe(true);
  });
  it('rolls false at/above the chance threshold', () => {
    expect(rollLuckyGem(() => LUCKY_GEM_CHANCE)).toBe(false);
    expect(rollLuckyGem(() => 0.99)).toBe(false);
  });
  it('multiplier doubles the base gem value', () => {
    expect(LUCKY_GEM_MULTIPLIER).toBe(2);
  });
});
