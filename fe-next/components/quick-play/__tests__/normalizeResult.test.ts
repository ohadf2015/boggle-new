import { describe, it, expect } from 'vitest';
import { fromWordWheel, fromSurvival, fromSinglePlayer, fromBlast } from '../adapters/normalizeResult';
import type { QuickRoundConfig } from '../types';

const cfg: QuickRoundConfig = {
  mode: 'wheel-rush', seed: 's1', durationSec: 60, grid: [],
  totalWords: 3, perfectScore: 500,
};

describe('normalizeResult', () => {
  it('word wheel result normalizes', () => {
    const r = fromWordWheel({ wordsFound: ['cat'], score: 100, timeSeconds: 60 }, cfg);
    expect(r).toMatchObject({
      mode: 'wheel-rush', seed: 's1', score: 100, perfectScore: 500,
      scorePct: 20, wordsFound: 1, totalWords: 3, durationMs: 60000,
    });
  });

  it('survival result scores from discovered words', () => {
    const r = fromSurvival(
      { wordsDiscovered: [{ word: 'cat' }, { word: 'trade' }] },
      { ...cfg, mode: 'word-hunt' }
    );
    expect(r.wordsFound).toBe(2);
    expect(r.score).toBeGreaterThan(0);
    expect(r.scorePct).toBeGreaterThan(0);
  });

  it('single player result normalizes', () => {
    const r = fromSinglePlayer({ score: 500, wordsFound: ['x'] }, { ...cfg, mode: 'classic' });
    expect(r.scorePct).toBe(100);
  });

  it('blast cascade overshoot caps at 100', () => {
    const r = fromBlast({ score: 1200, wordsFound: ['a', 'b'] }, { ...cfg, mode: 'blast', perfectScore: 1000 });
    expect(r.scorePct).toBe(100);
    expect(r.score).toBe(1200);
  });

  it('zero perfect never divides by zero', () => {
    const r = fromBlast({ score: 10, wordsFound: [] }, { ...cfg, mode: 'blast', perfectScore: 0 });
    expect(r.scorePct).toBe(0);
  });
});
