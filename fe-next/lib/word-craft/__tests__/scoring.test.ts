import { describe, it, expect } from 'vitest';
import { scoreWord, scoreTurn, scoreWordChips, BINGO_BONUS, BINGO_THRESHOLD } from '../scoring';
import type { ScoringTile } from '../types';

const t = (letter: string, value: number, premium: ScoringTile['premium'] = null): ScoringTile =>
  ({ letter, value, premium });

describe('scoreWord (pure)', () => {
  it('empty word scores 0', () => {
    expect(scoreWord([])).toBe(0);
  });

  it('plain CAT (3+1+1) scores 5 with no premiums', () => {
    expect(scoreWord([t('C', 3), t('A', 1), t('T', 1)])).toBe(5);
  });

  it('DL on C in CAT doubles only the C: 6+1+1 = 8', () => {
    expect(scoreWord([t('C', 3, 'DL'), t('A', 1), t('T', 1)])).toBe(8);
  });

  it('TL on A in CAT triples only the A: 3+3+1 = 7', () => {
    expect(scoreWord([t('C', 3), t('A', 1, 'TL'), t('T', 1)])).toBe(7);
  });

  it('DW on any tile doubles the whole word: (3+1+1)*2 = 10', () => {
    expect(scoreWord([t('C', 3), t('A', 1, 'DW'), t('T', 1)])).toBe(10);
  });

  it('TW triples the whole word: (3+1+1)*3 = 15', () => {
    expect(scoreWord([t('C', 3, 'TW'), t('A', 1), t('T', 1)])).toBe(15);
  });

  it('DL on C and DW on T combine: (6+1+1)*2 = 16', () => {
    expect(scoreWord([t('C', 3, 'DL'), t('A', 1), t('T', 1, 'DW')])).toBe(16);
  });

  it('two DWs multiply: (3+1+1)*2*2 = 20', () => {
    expect(scoreWord([t('C', 3, 'DW'), t('A', 1), t('T', 1, 'DW')])).toBe(20);
  });

  it('blank (value 0) on DL still scores 0 for that letter', () => {
    expect(scoreWord([t('_', 0, 'DL'), t('A', 1), t('T', 1)])).toBe(2);
  });

  it('null premium acts identically to no premium (already-used squares)', () => {
    expect(scoreWord([t('C', 3, null), t('A', 1, null), t('T', 1, null)])).toBe(5);
  });
});

describe('scoreTurn', () => {
  it('single word, sub-bingo placement: returns word score', () => {
    const word: ScoringTile[] = [t('C', 3), t('A', 1), t('T', 1)];
    expect(scoreTurn([word], 3)).toBe(5);
  });

  it('two words formed (main + perpendicular cross-word): sum of both', () => {
    const main: ScoringTile[] = [t('C', 3), t('A', 1), t('T', 1)];
    const cross: ScoringTile[] = [t('A', 1), t('T', 1)];
    expect(scoreTurn([main, cross], 3)).toBe(7);
  });

  it('placing all 7 tiles awards bingo bonus on top of word score', () => {
    const word: ScoringTile[] = [t('S', 1), t('T', 1), t('R', 1), t('A', 1), t('I', 1), t('N', 1), t('S', 1)];
    expect(scoreTurn([word], 7)).toBe(7 + BINGO_BONUS);
  });

  it('placing fewer than 7 tiles does NOT award bingo even if word is 7+ letters', () => {
    const word: ScoringTile[] = [t('S', 1), t('T', 1), t('R', 1), t('A', 1), t('I', 1), t('N', 1), t('S', 1)];
    expect(scoreTurn([word], 6)).toBe(7);
  });

  it('BINGO_THRESHOLD is 7 (standard rack size)', () => {
    expect(BINGO_THRESHOLD).toBe(7);
  });

  it('BINGO_BONUS is 50 (standard Scrabble-style bonus)', () => {
    expect(BINGO_BONUS).toBe(50);
  });

  it('zero words played returns 0', () => {
    expect(scoreTurn([], 0)).toBe(0);
  });
});

describe('scoreWordChips', () => {
  it('sums letter values into chips with baseMult 1 when no premiums', () => {
    const result = scoreWordChips([t('C', 3), t('A', 1), t('T', 1)]);
    expect(result).toEqual({ chips: 5, baseMult: 1 });
  });

  it('applies DL/TL letter multipliers to chips', () => {
    const result = scoreWordChips([t('C', 3, 'DL'), t('A', 1, 'TL'), t('T', 1)]);
    expect(result.chips).toBe(3 * 2 + 1 * 3 + 1); // 10
    expect(result.baseMult).toBe(1);
  });

  it('accumulates DW/TW into baseMult, not chips', () => {
    const result = scoreWordChips([t('C', 3, 'DW'), t('A', 1, 'TW'), t('T', 1)]);
    expect(result.chips).toBe(5);
    expect(result.baseMult).toBe(2 * 3); // 6
  });
});
