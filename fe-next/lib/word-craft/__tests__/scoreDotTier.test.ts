import { describe, expect, it } from 'vitest';
import { scoreDotTier, TIER_COLOR_CLASS } from '../scoreDotTier';

describe('scoreDotTier', () => {
  it('1pt = common', () => expect(scoreDotTier(1)).toBe('common'));
  it('2pt = mid', () => expect(scoreDotTier(2)).toBe('mid'));
  it('3pt = mid', () => expect(scoreDotTier(3)).toBe('mid'));
  it('4pt = rare', () => expect(scoreDotTier(4)).toBe('rare'));
  it('5pt = rare', () => expect(scoreDotTier(5)).toBe('rare'));
  it('8pt = legendary', () => expect(scoreDotTier(8)).toBe('legendary'));
  it('10pt = legendary', () => expect(scoreDotTier(10)).toBe('legendary'));
  it('0pt (blank) = common', () => expect(scoreDotTier(0)).toBe('common'));
});

describe('TIER_COLOR_CLASS', () => {
  it('returns a Tailwind class for every tier', () => {
    expect(TIER_COLOR_CLASS.common).toMatch(/^bg-/);
    expect(TIER_COLOR_CLASS.mid).toMatch(/^bg-/);
    expect(TIER_COLOR_CLASS.rare).toMatch(/^bg-/);
    expect(TIER_COLOR_CLASS.legendary).toMatch(/^bg-/);
  });
});
