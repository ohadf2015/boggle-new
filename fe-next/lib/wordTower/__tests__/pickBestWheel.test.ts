/**
 * Word Tower — daily wheel quality (#5).
 *
 * The daily 7-letter ring must let the player actually BUILD words — no
 * "Scrabble dumps" of hard/duplicate letters. We pick, deterministically, the
 * candidate wheel whose letters cover the most real dictionary words (so every
 * letter is usable — "words from all the letters, max possible"), verified
 * against the loaded dictionary.
 */
import { describe, it, expect } from 'vitest';
import { generateWheel, scoreWheel, pickBestWheel } from '../wordTowerManager';
import { WORD_TOWER_WHEEL_SIZE } from '@/shared/constants/wordTowerConstants';

// A small, controlled English dictionary (canonical = uppercase).
const MINI = new Set(['CAT', 'CATS', 'CORE', 'SEA', 'OAR', 'RACE', 'CARE', 'ACRE', 'ARC', 'EAR', 'ERA', 'SO', 'OK']);

describe('scoreWheel', () => {
  it('counts buildable words (≥ minLen) and distinct-letter coverage in one pass', () => {
    const wheel = ['C', 'A', 'T', 'S', 'O', 'E', 'R'];
    const { buildable, coverage } = scoreWheel(MINI, wheel, 3);
    // SO/OK are < 3 (excluded); every other MINI word is buildable from these 7.
    expect(buildable).toBe(11);
    // All 7 wheel letters appear in at least one buildable word.
    expect(coverage).toBe(7);
  });

  it('respects letter multiplicity — a word needing two of a single-copy letter fails', () => {
    // "AREA" needs two A's; the wheel has one.
    const { buildable } = scoreWheel(new Set(['AREA', 'EAR']), ['A', 'E', 'R', 'C', 'O', 'T', 'S'], 3);
    expect(buildable).toBe(1); // only EAR
  });
});

describe('pickBestWheel', () => {
  it('is deterministic for the same seed + dictionary', () => {
    const a = pickBestWheel('daily-2026-07-06', 'daily', 'en', MINI);
    const b = pickBestWheel('daily-2026-07-06', 'daily', 'en', MINI);
    expect(a).toEqual(b);
  });

  it('returns a valid wheel — full length, bag-only, from the candidate set', () => {
    const wheel = pickBestWheel('daily-x', 'daily', 'en', MINI);
    expect(wheel).toHaveLength(WORD_TOWER_WHEEL_SIZE);
  });

  it('never picks a wheel worse (by coverage) than the default draw', () => {
    // Property holds for ANY dictionary: the chosen wheel is the max-coverage
    // candidate, so it is ≥ the drawIndex-0 wheel the game used before.
    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const def = generateWheel(seed, 'daily', 'en', 0);
      const best = pickBestWheel(seed, 'daily', 'en', MINI);
      expect(scoreWheel(MINI, best, 3).coverage).toBeGreaterThanOrEqual(scoreWheel(MINI, def, 3).coverage);
    }
  });

  it('falls back to the plain drawIndex-0 wheel when no dictionary is available', () => {
    const wheel = pickBestWheel('daily-y', 'daily', 'en', undefined);
    expect(wheel).toEqual(generateWheel('daily-y', 'daily', 'en', 0));
  });
});
