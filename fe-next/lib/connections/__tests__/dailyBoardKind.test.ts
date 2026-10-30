import { describe, it, expect } from 'vitest';
import { dailyPuzzleSet, isPyramidDaily, maxDailyScore, pyramidLocalesOn } from '../daily';
import { FINALE_POINTS } from '../pyramid/gameLogic';
import { POINTS_HARD } from '../gameLogic';
import { getPuzzlesForLocale } from '../puzzles';

const PYRAMID_DAY = '2026-09-07';
const REGULAR_DAY = '2026-09-08';

describe('daily board kind (pyramid vs chain)', () => {
  it('a pyramid day is a pyramid run only for locales with a pyramid pool', () => {
    expect(isPyramidDaily(PYRAMID_DAY, 'en')).toBe(true);
    expect(isPyramidDaily(PYRAMID_DAY, 'he')).toBe(true);
    expect(isPyramidDaily(PYRAMID_DAY, 'sv')).toBe(false);
    expect(isPyramidDaily(REGULAR_DAY, 'en')).toBe(false);
  });

  it('lists the pyramid locales only on pyramid days', () => {
    expect(pyramidLocalesOn(PYRAMID_DAY).sort()).toEqual(['en', 'he']);
    expect(pyramidLocalesOn(REGULAR_DAY)).toEqual([]);
  });

  it('a pyramid day ceiling admits a perfect pyramid (3 hard bases + finale)', () => {
    expect(maxDailyScore(PYRAMID_DAY, 'en')).toBeGreaterThanOrEqual(3 * POINTS_HARD + FINALE_POINTS);
  });

  it('a locale without pyramids keeps the chain ceiling on a pyramid day', () => {
    const chain = dailyPuzzleSet(PYRAMID_DAY, 'sv');
    expect(maxDailyScore(PYRAMID_DAY, 'sv')).toBeLessThan(chain.length * 1000);
    expect(maxDailyScore(PYRAMID_DAY, 'sv')).toBe(maxDailyScore(PYRAMID_DAY, 'sv', undefined));
  });

  it('the ceiling follows the puzzles the client actually played', () => {
    const base = maxDailyScore(REGULAR_DAY, 'en');
    const set = dailyPuzzleSet(REGULAR_DAY, 'en');
    expect(maxDailyScore(REGULAR_DAY, 'en', set.map((p) => p.id))).toBe(base);
    const hard = getPuzzlesForLocale('en').filter((p) => p.difficulty === 'hard').slice(0, 5);
    expect(maxDailyScore(REGULAR_DAY, 'en', hard.map((p) => p.id))).toBeGreaterThanOrEqual(5 * POINTS_HARD);
  });

  it('ignores a played-ids list that is not a full set of real puzzles', () => {
    const base = maxDailyScore(REGULAR_DAY, 'en');
    expect(maxDailyScore(REGULAR_DAY, 'en', ['nope-1', 'nope-2'])).toBe(base);
    const one = dailyPuzzleSet(REGULAR_DAY, 'en')[0].id;
    expect(maxDailyScore(REGULAR_DAY, 'en', [one, one, one, one, one])).toBe(base);
  });
});
