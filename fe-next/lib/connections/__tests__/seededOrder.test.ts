import { describe, it, expect } from 'vitest';
import { getPuzzleForLevel, getTotalLevels, CURATED_OPENING } from '../puzzles';

function orderFor(locale: string, seed: number, count: number): string[] {
  const ids: string[] = [];
  for (let lvl = 1; lvl <= count; lvl++) {
    const p = getPuzzleForLevel(locale, lvl, undefined, seed);
    if (p) ids.push(p.id);
  }
  return ids;
}

describe('per-player seeded puzzle order', () => {
  it('seed 0 / omitted matches the legacy deterministic order', () => {
    const legacy = orderFor('en', 0, 30);
    for (let lvl = 1; lvl <= 30; lvl++) {
      expect(getPuzzleForLevel('en', lvl)?.id).toBe(legacy[lvl - 1]);
    }
  });

  it('the same seed always produces the same order', () => {
    expect(orderFor('en', 12345, 40)).toEqual(orderFor('en', 12345, 40));
  });

  it('different seeds produce different orders (after the curated opening)', () => {
    const total = getTotalLevels('en');
    const a = orderFor('en', 1, total).slice(8);
    const b = orderFor('en', 2, total).slice(8);
    expect(a).not.toEqual(b);
    // Same puzzles, different arrangement.
    expect([...a].sort()).toEqual([...b].sort());
  });

  it('keeps the curated opening pinned for every seed', () => {
    const opening = CURATED_OPENING.en ?? [];
    expect(opening.length).toBeGreaterThan(0);
    for (const seed of [0, 1, 999, 2 ** 30]) {
      const ids = orderFor('en', seed, opening.length);
      expect(ids).toEqual([...opening]);
    }
  });

  it('never places the same bridge back-to-back within a seeded order', () => {
    const total = getTotalLevels('en');
    for (const seed of [7, 4242]) {
      let prev: string | null = null;
      for (let lvl = 1; lvl <= total; lvl++) {
        const p = getPuzzleForLevel('en', lvl, undefined, seed)!;
        expect(p.bridge).not.toBe(prev);
        prev = p.bridge;
      }
    }
  });

  it('preserves the easy → medium → hard ramp for any seed', () => {
    const total = getTotalLevels('en');
    const rank = { easy: 0, medium: 1, hard: 2 } as const;
    let prevRank = 0;
    for (let lvl = 1; lvl <= total; lvl++) {
      const p = getPuzzleForLevel('en', lvl, undefined, 31337)!;
      const r = rank[p.difficulty];
      expect(r).toBeGreaterThanOrEqual(prevRank);
      prevRank = r;
    }
  });
});
