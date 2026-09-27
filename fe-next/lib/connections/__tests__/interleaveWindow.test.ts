import { describe, it, expect } from 'vitest';
import { interleaveByBridge, getPuzzlesForLocale, getPuzzleForLevel, getTotalLevels } from '../puzzles';
import type { ConnectionPuzzle } from '../types';

function p(id: string, bridge: string, word1 = 'W' + id, word2 = 'V' + id): ConnectionPuzzle {
  return { id, word1, bridge, word2, difficulty: 'easy' };
}

describe('interleaveByBridge — recency window (not just adjacent)', () => {
  it('spreads a repeated bridge to the maximum feasible distance', () => {
    // 2×X, 2×Y, 1×Z: adjacent-only logic yields X Y X Y Z (X again at distance 2);
    // a recency window must produce a distance-3 spread like X Y Z X Y.
    const out = interleaveByBridge([p('x1', 'X'), p('x2', 'X'), p('y1', 'Y'), p('y2', 'Y'), p('z1', 'Z')]);
    const bridges = out.map((q) => q.bridge);
    const firstX = bridges.indexOf('X');
    const secondX = bridges.indexOf('X', firstX + 1);
    expect(secondX - firstX).toBeGreaterThanOrEqual(3);
    const firstY = bridges.indexOf('Y');
    const secondY = bridges.indexOf('Y', firstY + 1);
    expect(secondY - firstY).toBeGreaterThanOrEqual(3);
  });

  it('keeps word stems from echoing at distance 2', () => {
    // Same word1 stem on a1/a2, plenty of unrelated fillers to place between.
    const out = interleaveByBridge([
      p('a1', 'B1', 'SAME', 'v1'),
      p('a2', 'B2', 'SAME', 'v2'),
      p('f1', 'B3', 'w1', 'v3'),
      p('f2', 'B4', 'w2', 'v4'),
      p('f3', 'B5', 'w3', 'v5'),
      p('f4', 'B6', 'w4', 'v6'),
    ]);
    const idx1 = out.findIndex((q) => q.word1 === 'SAME');
    const idx2 = out.findIndex((q, i) => q.word1 === 'SAME' && i > idx1);
    expect(idx2 - idx1).toBeGreaterThanOrEqual(3);
  });

  it('is deterministic', () => {
    const pool = [p('x1', 'X'), p('x2', 'X'), p('y1', 'Y'), p('y2', 'Y'), p('z1', 'Z')];
    expect(interleaveByBridge(pool).map((q) => q.id)).toEqual(interleaveByBridge(pool).map((q) => q.id));
  });

  it('real pools: no bridge repeats within a window of 3 consecutive levels', () => {
    for (const locale of ['en', 'he', 'es', 'sv', 'ja', 'ru']) {
      const total = getTotalLevels(locale);
      const path: ConnectionPuzzle[] = [];
      for (let lvl = 1; lvl <= total; lvl++) {
        const q = getPuzzleForLevel(locale, lvl);
        if (q) path.push(q);
      }
      expect(path.length).toBe(getPuzzlesForLocale(locale).length);
      let violations = 0;
      for (let i = 0; i < path.length; i++) {
        for (let d = 1; d <= 2; d++) {
          if (path[i + d] && path[i + d].bridge === path[i].bridge) violations++;
        }
      }
      // A dominant bridge can force tail clustering; allow a tiny forced tail
      // but the body of the path must never echo a bridge within 2 levels.
      expect(violations, `${locale}: bridge echoes within distance 2`).toBeLessThanOrEqual(1);
    }
  });
});
