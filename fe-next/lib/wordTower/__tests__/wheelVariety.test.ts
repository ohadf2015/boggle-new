/**
 * Word Tower — wheel variety (Phase 4).
 *
 * The 7-letter ring is reused for many words, so a wheel with 3–4 copies of one
 * letter wastes slots and starves word variety. The generator caps duplicates
 * (deterministically) while preserving determinism, length, bag membership, and
 * the vowel guarantee.
 */
import { describe, it, expect } from 'vitest';
import { generateWheel } from '../wordTowerManager';
import {
  WORD_TOWER_WHEEL_SIZE,
  WORD_TOWER_WHEEL_MAX_SAME,
  WORD_TOWER_WHEEL_MIN_VOWELS,
  WORD_TOWER_VOWELS,
  WORD_TOWER_LETTER_BAGS,
} from '@/shared/constants/wordTowerConstants';

const maxDup = (wheel: string[]): number => {
  const counts = new Map<string, number>();
  let m = 0;
  for (const c of wheel) {
    const n = (counts.get(c) ?? 0) + 1;
    counts.set(c, n);
    m = Math.max(m, n);
  }
  return m;
};

describe('generateWheel — duplicate cap', () => {
  it('caps any single letter to WHEEL_MAX_SAME for a rich bag (en) across seeds', () => {
    for (let i = 0; i < 60; i++) {
      const wheel = generateWheel('VG', `p${i}`, 'en', i);
      expect(maxDup(wheel)).toBeLessThanOrEqual(WORD_TOWER_WHEEL_MAX_SAME);
    }
  });

  it('still deterministic, full-length, bag-only, and vowel-guaranteed', () => {
    const a = generateWheel('VG', 'p1', 'en', 0);
    const b = generateWheel('VG', 'p1', 'en', 0);
    expect(a).toEqual(b);
    expect(a).toHaveLength(WORD_TOWER_WHEEL_SIZE);
    const bag = new Set(WORD_TOWER_LETTER_BAGS.en.split(''));
    for (const c of a) expect(bag.has(c)).toBe(true);
    const vowels = new Set(WORD_TOWER_VOWELS.en.split(''));
    expect(a.filter((c) => vowels.has(c)).length).toBeGreaterThanOrEqual(WORD_TOWER_WHEEL_MIN_VOWELS);
  });

  it('guarantees a varied ring — a cap of 2 on 7 slots forces ≥4 distinct letters', () => {
    let lowVariety = 0;
    for (let i = 0; i < 60; i++) {
      const wheel = generateWheel('VG2', `p${i}`, 'en', i);
      if (new Set(wheel).size < 4) lowVariety++;
    }
    expect(lowVariety).toBe(0);
  });
});
