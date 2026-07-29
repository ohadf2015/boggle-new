import { describe, it, expect } from 'vitest';
import { interestingnessScore, INTERESTINGNESS_THRESHOLD } from '../generator/interestingness';
import type { BlastLevel } from '../types';

describe('interestingness', () => {
  it('score is in [0,1]', () => {
    const lvl: BlastLevel = {
      id: 'test', levelNumber: 1, theme: 'fruits', locale: 'en',
      words: ['TEST', 'WORD'], columns: [
        { index: 0, tiles: ['T', 'W'] },
        { index: 1, tiles: ['E', 'O'] },
        { index: 2, tiles: ['S', 'R'] },
        { index: 3, tiles: ['T', 'D'] },
      ],
      resolvableOrder: ['TEST', 'WORD'], tileFlags: {}, difficulty: 1,
    };
    const score = interestingnessScore(lvl);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('uniform 4x4 single word scores below threshold', () => {
    const lvl: BlastLevel = {
      id: 'test', levelNumber: 1, theme: 'fruits', locale: 'en',
      words: ['TEST'],
      columns: [
        { index: 0, tiles: ['T', 'T', 'T', 'T'] },
        { index: 1, tiles: ['E', 'E', 'E', 'E'] },
        { index: 2, tiles: ['S', 'S', 'S', 'S'] },
        { index: 3, tiles: ['T', 'T', 'T', 'T'] },
      ],
      resolvableOrder: ['TEST'], tileFlags: {}, difficulty: 1,
    };
    const score = interestingnessScore(lvl);
    expect(score).toBeLessThan(0.55);
  });

  it('varied silhouette with 5 words scores high', () => {
    const lvl: BlastLevel = {
      id: 'test', levelNumber: 1, theme: 'fruits', locale: 'en',
      words: ['APPLE', 'BANANA', 'ORANGE', 'GRAPE', 'MELON'],
      columns: [
        { index: 0, tiles: ['A', 'B', 'O', 'G', 'M'] },
        { index: 1, tiles: ['P', 'A'] },
        { index: 2, tiles: ['P', 'N'] },
        { index: 3, tiles: ['L', 'A'] },
        { index: 4, tiles: ['E'] },
      ],
      resolvableOrder: ['APPLE', 'BANANA', 'ORANGE', 'GRAPE', 'MELON'],
      tileFlags: {}, difficulty: 1,
    };
    const score = interestingnessScore(lvl);
    expect(score).toBeGreaterThan(0.5);
  });

  it('INTERESTINGNESS_THRESHOLD is 0.55', () => {
    expect(INTERESTINGNESS_THRESHOLD).toBe(0.55);
  });
});
