/**
 * Given words found at known moments, When scored, Then quick successive words
 * build a combo and a speed bonus that grow their points — computed from the
 * word times the server also receives, so HUD and settle agree.
 */
import { describe, it, expect } from 'vitest';
import { scoreWords, scoreRun, wordMultipliers, QUICK_MS, MAX_WORD_MULT } from '../scoreRun';
import { settleRun } from '../settleRun';

const flat = () => 100;
const words = ['aaa', 'bbb', 'ccc', 'ddd', 'eee', 'fff'];

describe('wordMultipliers', () => {
  it('Given no times, When asked, Then every word is x1 with no combo', () => {
    const m = wordMultipliers(4);
    expect(m.mult).toEqual([1, 1, 1, 1]);
    expect(m.combo).toEqual([0, 0, 0, 0]);
  });

  it('Given words 1s apart, When asked, Then the combo climbs and later words are worth more', () => {
    const m = wordMultipliers(6, [0, 1000, 2000, 3000, 4000, 5000]);
    expect(m.combo).toEqual([0, 1, 2, 3, 4, 5]);
    for (let i = 1; i < 6; i++) expect(m.mult[i]).toBeGreaterThanOrEqual(m.mult[i - 1]);
    expect(m.mult[5]).toBeGreaterThan(1.25);
  });

  it('Given a long pause, When asked, Then the combo breaks back to 0', () => {
    const m = wordMultipliers(3, [0, 1000, 30_000]);
    expect(m.combo).toEqual([0, 1, 0]);
    expect(m.mult[2]).toBe(1);
  });

  it('Given a quick word with no combo tier yet, When asked, Then speed alone still pays a little', () => {
    const m = wordMultipliers(2, [0, QUICK_MS - 1]);
    expect(m.mult[1]).toBeGreaterThan(1);
  });

  it('Given an endless streak, When asked, Then the multiplier is capped', () => {
    const n = 60;
    const m = wordMultipliers(n, Array.from({ length: n }, (_, i) => i * 500));
    expect(Math.max(...m.mult)).toBeLessThanOrEqual(MAX_WORD_MULT);
  });
});

describe('scoreWords with times', () => {
  it('Given the same words, When found fast vs with no times, Then the fast run scores more', () => {
    const slow = scoreWords(words, { pointsFor: flat });
    const fast = scoreWords(words, { pointsFor: flat, times: [0, 800, 1600, 2400, 3200, 4000] });
    expect(slow.score).toBe(600);
    expect(fast.score).toBeGreaterThan(slow.score);
    expect(fast.points[0]).toBe(100);
  });
});

describe('scoreRun time sanitising', () => {
  const grid = [['c', 'a', 't'], ['d', 'o', 'g'], ['x', 'x', 'x']];
  const dict = new Set(['cat', 'dog', 'cog']);
  const base = { grid, language: 'en', minLength: 3, isWord: (w: string) => dict.has(w), pointsFor: flat };

  it('Given a times array of the wrong length, When scored, Then it is ignored (no bonus)', () => {
    const r = scoreRun({ ...base, words: ['cat', 'dog'], times: [0] });
    expect(r.score).toBe(200);
  });

  it('Given an invalid word between two valid ones, When scored, Then valid words keep their own times', () => {
    const quick = scoreRun({ ...base, words: ['cat', 'zzz', 'dog'], times: [0, 300, 900] });
    const late = scoreRun({ ...base, words: ['cat', 'zzz', 'dog'], times: [0, 300, 60_000] });
    // dog keeps ITS time (900 / 60s), not the dropped word's slot.
    expect(quick.points[1]).toBeGreaterThan(100);
    expect(late.points[1]).toBe(100);
  });

  it('Given garbage times, When scored, Then they never produce NaN', () => {
    const r = scoreRun({ ...base, words: ['cat', 'dog'], times: ['x', null] as unknown as number[] });
    expect(Number.isFinite(r.score)).toBe(true);
  });
});

describe('settleRun with times', () => {
  it('Given words found quickly, When settled, Then the server credits the combo too', () => {
    const grid = [['c', 'a', 't', 's'], ['o', 'x', 'x', 'x'], ['d', 'o', 'g', 'x'], ['x', 'x', 'x', 'x']];
    const dict = new Set(['cat', 'cats', 'dog']);
    const payload = { u: 'u1', g: grid, lang: 'en', t: 1_000_000, w: 1, l: 1 };
    const args = { payload, words: ['cat', 'cats', 'dog'], now: payload.t + 30_000, isWord: (w: string) => dict.has(w), prevStars: 0, pointsFor: flat };
    const plain = settleRun(args);
    const quick = settleRun({ ...args, times: [0, 900, 1800] });
    expect(plain.ok && quick.ok).toBe(true);
    if (!plain.ok || !quick.ok) return;
    expect(quick.score).toBeGreaterThan(plain.score);
  });
});
