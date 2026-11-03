import { describe, it, expect } from 'vitest';
import { bombTilePoints, crossTilePoints, gemClearPoints, surgePoints, jitter } from '../blastPayout';

const ctx = (seed = 'cat:3:0.0-0.1', wave = 3) => ({ seed, wave });

describe('blast payouts', () => {
  it('is deterministic, so client and MP server agree', () => {
    expect(bombTilePoints(ctx(), 2, 3, 1)).toBe(bombTilePoints(ctx(), 2, 3, 1));
  });
  it('is not one flat number: tiles and moves roll different payouts', () => {
    const cells = Array.from({ length: 36 }, (_, i) => bombTilePoints(ctx(), Math.floor(i / 6), i % 6, 0));
    expect(new Set(cells).size).toBeGreaterThan(2);
    const moves = Array.from({ length: 20 }, (_, i) => gemClearPoints(ctx(`w${i}:3:0.0`), 1, 1, 'sapphire'));
    expect(new Set(moves).size).toBeGreaterThan(5);
  });
  it('grows with chain depth, wave, word length and gem rarity (on average)', () => {
    const avg = (f: (i: number) => number) => Array.from({ length: 60 }, (_, i) => f(i)).reduce((a, b) => a + b, 0) / 60;
    expect(avg((i) => bombTilePoints(ctx(`m${i}`), 1, 1, 3))).toBeGreaterThan(avg((i) => bombTilePoints(ctx(`m${i}`), 1, 1, 0)));
    expect(avg((i) => bombTilePoints(ctx(`m${i}`, 12), 1, 1, 0))).toBeGreaterThan(avg((i) => bombTilePoints(ctx(`m${i}`, 1), 1, 1, 0)));
    expect(avg((i) => crossTilePoints(ctx(`m${i}`), 1, 1, 8, 'ruby'))).toBeGreaterThan(avg((i) => crossTilePoints(ctx(`m${i}`), 1, 1, 3, 'emerald')));
    expect(avg((i) => gemClearPoints(ctx(`m${i}`), 1, 1, 'ruby'))).toBeGreaterThan(avg((i) => gemClearPoints(ctx(`m${i}`), 1, 1, 'emerald')));
    expect(surgePoints(ctx(), 3, 9)).toBeGreaterThan(surgePoints(ctx(), 3, 3));
  });
  it('keeps jitter inside its band and never pays zero', () => {
    for (let i = 0; i < 200; i++) {
      const j = jitter(`k${i}`, 0.4);
      expect(j).toBeGreaterThanOrEqual(0.6);
      expect(j).toBeLessThanOrEqual(1.4);
      expect(bombTilePoints(ctx(`k${i}`, 1), 0, 0, 0)).toBeGreaterThanOrEqual(1);
    }
    expect(surgePoints(ctx(), 0, 5)).toBe(0);
  });
});
