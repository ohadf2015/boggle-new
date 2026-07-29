import { describe, expect, it } from 'vitest';
import { scoreTurn, BINGO_BONUS } from '../scoring';
import type { ScoringTile } from '../types';

const tile = (value: number, premium: ScoringTile['premium'] = null): ScoringTile => ({ value, premium });

describe('scoreTurn with a modifier spec', () => {
  it('with no spec behaves exactly like the unmodified scorer', () => {
    const word = [tile(1), tile(2), tile(3)];
    expect(scoreTurn([word], 3)).toBe(scoreTurn([word], 3, {}));
    expect(scoreTurn([word], 3, {})).toBe(6);
  });

  it('bingoBonus overrides the default bingo bonus', () => {
    const seven = Array.from({ length: 7 }, () => tile(1));
    expect(scoreTurn([seven], 7)).toBe(7 + BINGO_BONUS);
    expect(scoreTurn([seven], 7, { bingoBonus: 90 })).toBe(7 + 90);
  });

  it('longWordBonus adds a flat bonus to words at/above the threshold only', () => {
    const fiveLetters = Array.from({ length: 5 }, () => tile(1)); // length 5
    const fourLetters = Array.from({ length: 4 }, () => tile(1)); // length 4
    const spec = { longWordThreshold: 5, longWordBonus: 15 };
    expect(scoreTurn([fiveLetters], 5, spec)).toBe(5 + 15);
    expect(scoreTurn([fourLetters], 4, spec)).toBe(4); // below threshold, no bonus
  });

  it('richLetterMult multiplies high-value tiles before premiums', () => {
    // Q=10 base; with ×2 rich-letter and a DL premium it should be 10*2*2 = 40.
    const spec = { richLetterThreshold: 4, richLetterMult: 2 };
    expect(scoreTurn([[tile(10)]], 1, spec)).toBe(20);
    expect(scoreTurn([[tile(10, 'DL')]], 1, spec)).toBe(40);
    // A low-value tile is untouched by rich_letters.
    expect(scoreTurn([[tile(1)]], 1, spec)).toBe(1);
  });
});
