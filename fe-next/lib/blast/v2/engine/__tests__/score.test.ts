import { describe, it, expect } from 'vitest';
import { scoreForWord } from '../score';
import { cellId } from '../cell-id';
import type { BlastLevel } from '../../types';

describe('score helpers', () => {
  const baseLevel: BlastLevel = {
    id: 'score-test',
    levelNumber: 1,
    locale: 'en',
    theme: 'onboarding',
    columns: [
      { index: 0, tiles: ['A', 'B', 'C'] },
      { index: 1, tiles: ['D', 'E', 'F'] },
      { index: 2, tiles: ['G', 'H', 'I'] },
    ],
    words: [],
    resolvableOrder: [],
    tileFlags: {},
    gravityMode: 'standard',
    difficulty: 1,
  };

  it('theme word: wordLen * 10', () => {
    const cells = [cellId(0, 0), cellId(1, 0), cellId(2, 0)];
    const result = scoreForWord(baseLevel, cells, 'theme');
    expect(result.coinsBase).toBe(30); // 3 * 10
    expect(result.multiplier).toBe(1);
  });

  it('cascade word: wordLen * 20', () => {
    const cells = [cellId(0, 1), cellId(1, 1)];
    const result = scoreForWord(baseLevel, cells, 'cascade');
    expect(result.coinsBase).toBe(40); // 2 * 20
  });

  describe('bonus word: length-scaled (rewards longer off-theme finds)', () => {
    // Formula: wordLen * 5 + max(0, wordLen - 3) * 5
    const cellsOfLen = (n: number) => Array.from({ length: n }, (_, i) => cellId(i % 3, Math.floor(i / 3)));
    it('3-letter bonus → 15', () => {
      expect(scoreForWord(baseLevel, cellsOfLen(3), 'bonus').coinsBase).toBe(15);
    });
    it('4-letter bonus → 25', () => {
      expect(scoreForWord(baseLevel, cellsOfLen(4), 'bonus').coinsBase).toBe(25);
    });
    it('5-letter bonus → 35', () => {
      expect(scoreForWord(baseLevel, cellsOfLen(5), 'bonus').coinsBase).toBe(35);
    });
    it('7-letter bonus → 55', () => {
      expect(scoreForWord(baseLevel, cellsOfLen(7), 'bonus').coinsBase).toBe(55);
    });
    it('stays below the same-length theme word (theme stays primary)', () => {
      const five = cellsOfLen(5);
      expect(scoreForWord(baseLevel, five, 'bonus').coinsBase).toBeLessThan(
        scoreForWord(baseLevel, five, 'theme').coinsBase,
      );
    });
  });

  it('double_bonus tile now multiplies a bonus word too', () => {
    const level = { ...baseLevel, tileFlags: { [cellId(0, 0)]: ['double_bonus'] as const } };
    const cells = [cellId(0, 0), cellId(1, 0), cellId(2, 0)]; // 3 letters → 15 base
    const result = scoreForWord(level, cells, 'bonus');
    expect(result.coinsBase).toBe(30); // 15 * 2
    expect(result.multiplier).toBe(2);
  });

  it('double_bonus tile multiplies theme word by 2', () => {
    const level = { ...baseLevel, tileFlags: { [cellId(0, 0)]: ['double_bonus'] } };
    const cells = [cellId(0, 0), cellId(1, 0)];
    const result = scoreForWord(level, cells, 'theme');
    expect(result.coinsBase).toBe(40); // 2 * 10 * 2
    expect(result.multiplier).toBe(2);
  });

  it('coin overlay adds +5 per tile', () => {
    const level = {
      ...baseLevel,
      tileFlags: {
        [cellId(0, 0)]: ['coin'],
        [cellId(1, 0)]: ['coin'],
      },
    };
    const cells = [cellId(0, 0), cellId(1, 0)];
    const result = scoreForWord(level, cells, 'theme');
    expect(result.coinsFromOverlays).toBe(10); // 2 * 5
  });

  describe('chain-depth multiplier', () => {
    it('chainDepth 1: no boost (first cascade is already 2× base)', () => {
      const cells = [cellId(0, 0), cellId(1, 0)];
      const result = scoreForWord(baseLevel, cells, 'cascade', 1);
      expect(result.coinsBase).toBe(40); // 2 * 20 * 1.0
      expect(result.chainMultiplier).toBe(1);
    });

    it('chainDepth 2: 1.5× boost', () => {
      const cells = [cellId(0, 0), cellId(1, 0)];
      const result = scoreForWord(baseLevel, cells, 'cascade', 2);
      expect(result.coinsBase).toBe(60); // 2 * 20 * 1.5
      expect(result.chainMultiplier).toBe(1.5);
    });

    it('chainDepth 3: 2× boost', () => {
      const cells = [cellId(0, 0), cellId(1, 0)];
      const result = scoreForWord(baseLevel, cells, 'cascade', 3);
      expect(result.coinsBase).toBe(80); // 2 * 20 * 2
      expect(result.chainMultiplier).toBe(2);
    });

    it('chainDepth 4: 3× boost', () => {
      const cells = [cellId(0, 0), cellId(1, 0)];
      const result = scoreForWord(baseLevel, cells, 'cascade', 4);
      expect(result.coinsBase).toBe(120); // 2 * 20 * 3
      expect(result.chainMultiplier).toBe(3);
    });

    it('chainDepth 5+: caps at 4× boost', () => {
      const cells = [cellId(0, 0), cellId(1, 0)];
      const r5 = scoreForWord(baseLevel, cells, 'cascade', 5);
      const r9 = scoreForWord(baseLevel, cells, 'cascade', 9);
      expect(r5.chainMultiplier).toBe(4);
      expect(r9.chainMultiplier).toBe(4);
      expect(r5.coinsBase).toBe(160); // 2 * 20 * 4
    });

    it('theme word ignores chainDepth (initial word, not a cascade)', () => {
      const cells = [cellId(0, 0), cellId(1, 0), cellId(2, 0)];
      const result = scoreForWord(baseLevel, cells, 'theme', 5);
      expect(result.coinsBase).toBe(30); // 3 * 10, no chain boost
      expect(result.chainMultiplier).toBe(1);
    });

    it('chain multiplier stacks with double_bonus tile', () => {
      const level = { ...baseLevel, tileFlags: { [cellId(0, 0)]: ['double_bonus'] as const } };
      const cells = [cellId(0, 0), cellId(1, 0)];
      const result = scoreForWord(level, cells, 'cascade', 3);
      // 2 * 20 = 40 base * double_bonus(2) = 80 * chain(2) = 160
      expect(result.coinsBase).toBe(160);
      expect(result.multiplier).toBe(2);
      expect(result.chainMultiplier).toBe(2);
    });
  });

  it('gem overlay adds +0.02 per tile to chest progress', () => {
    const level = {
      ...baseLevel,
      tileFlags: {
        [cellId(0, 0)]: ['gem'],
        [cellId(1, 0)]: ['gem'],
      },
    };
    const cells = [cellId(0, 0), cellId(1, 0)];
    const result = scoreForWord(level, cells, 'theme');
    expect(result.chestProgressDelta).toBe(0.04); // 2 * 0.02
  });
});
