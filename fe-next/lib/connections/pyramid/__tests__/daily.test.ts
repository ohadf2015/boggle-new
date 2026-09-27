import { describe, it, expect, vi } from 'vitest';
import { dailyPyramid } from '../daily';

function b(k: string) {
  return { id: k, word1: 'W1', bridge: 'B' + k, word2: 'W2', difficulty: 'easy' as const };
}

vi.mock('../puzzles', () => ({
  getPyramidsForLocale: (locale: string) =>
    locale === 'xx'
      ? []
      : [
          { id: 'en-pyr-001', metaAnswer: 'LIGHT', base: [b('a'), b('b'), b('c')], difficulty: 'medium' },
          { id: 'en-pyr-002', metaAnswer: 'HOUSE', base: [b('d'), b('e'), b('f')], difficulty: 'medium' },
          { id: 'en-pyr-003', metaAnswer: 'FIRE', base: [b('g'), b('h'), b('i')], difficulty: 'medium' },
        ],
}));

describe('dailyPyramid', () => {
  it('is deterministic for (date, locale)', () => {
    expect(dailyPyramid('2026-07-03', 'en')?.id).toBe(dailyPyramid('2026-07-03', 'en')?.id);
    expect(dailyPyramid('2026-07-03', 'en')).toEqual(dailyPyramid('2026-07-03', 'en'));
  });

  it('varies across dates over a window', () => {
    const ids = new Set(
      ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05', '2026-07-06'].map(
        (d) => dailyPyramid(d, 'en')?.id,
      ),
    );
    expect(ids.size).toBeGreaterThan(1);
  });

  it('differs between locales on the same date (seed includes locale)', () => {
    // Not guaranteed for every date with a 3-item pool, but the seed must
    // include the locale — assert over a window at least one date diverges.
    const dates = ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05'];
    const anyDiff = dates.some((d) => dailyPyramid(d, 'en')?.id !== dailyPyramid(d, 'he')?.id);
    expect(anyDiff).toBe(true);
  });

  it('returns null on empty pool', () => {
    expect(dailyPyramid('2026-07-03', 'xx')).toBeNull();
  });
});

describe('dailyPyramid — solved pyramids never reappear', () => {
  it('excludes solved ids from the pick', () => {
    const first = dailyPyramid('2026-08-01', 'en')!;
    const again = dailyPyramid('2026-08-01', 'en', new Set([first.id]));
    expect(again).not.toBeNull();
    expect(again!.id).not.toBe(first.id);
  });

  it('falls back to the full pool when everything is solved', () => {
    const first = dailyPyramid('2026-08-01', 'en')!;
    const allIds = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const d = `2026-0${(i % 8) + 1}-0${(i % 27) + 1}`;
      const p = dailyPyramid(d, 'en');
      if (p) allIds.add(p.id);
    }
    // Simulate "solved everything we could ever pick"
    const result = dailyPyramid('2026-08-01', 'en', new Set([...allIds, first.id]));
    expect(result).not.toBeNull();
  });
});
