import { describe, it, expect } from 'vitest';
import { getPuzzlesForLocale, getPuzzleForLevel, getTotalLevels } from '../puzzles';

describe('puzzle interleaving by bridge', () => {
  for (const locale of ['en', 'he'] as const) {
    it(`${locale}: never repeats the same bridge in adjacent levels unless mathematically forced`, () => {
      const total = getTotalLevels(locale);
      let forcedRepeats = 0;
      for (let lvl = 2; lvl <= total; lvl++) {
        const prev = getPuzzleForLevel(locale, lvl - 1)!;
        const cur = getPuzzleForLevel(locale, lvl)!;
        if (prev.bridge === cur.bridge && prev.difficulty === cur.difficulty) {
          forcedRepeats++;
        }
      }
      // A few forced repeats are acceptable — they only happen when one bridge
      // dominates the remaining pool of that difficulty. Cap loosely.
      expect(forcedRepeats).toBeLessThan(total * 0.05);
    });
  }

  // Players reported "many similar riddles one after another." Bridge dispersal
  // alone misses puzzles that share a stem (e.g. כוס+חלב followed by כוס+קפה —
  // different bridges, same word1). The interleave must spread word1 / word2
  // stems too so back-to-back puzzles don't *feel* identical.
  for (const locale of ['en', 'he'] as const) {
    it(`${locale}: rarely repeats the same word1 stem in adjacent same-difficulty levels`, () => {
      const total = getTotalLevels(locale);
      let stemRepeats = 0;
      for (let lvl = 2; lvl <= total; lvl++) {
        const prev = getPuzzleForLevel(locale, lvl - 1)!;
        const cur = getPuzzleForLevel(locale, lvl)!;
        if (prev.difficulty !== cur.difficulty) continue;
        if (prev.word1 === cur.word1) stemRepeats++;
      }
      expect(stemRepeats).toBeLessThan(total * 0.05);
    });

    it(`${locale}: rarely repeats the same word2 stem in adjacent same-difficulty levels`, () => {
      const total = getTotalLevels(locale);
      let stemRepeats = 0;
      for (let lvl = 2; lvl <= total; lvl++) {
        const prev = getPuzzleForLevel(locale, lvl - 1)!;
        const cur = getPuzzleForLevel(locale, lvl)!;
        if (prev.difficulty !== cur.difficulty) continue;
        if (prev.word2 === cur.word2) stemRepeats++;
      }
      expect(stemRepeats).toBeLessThan(total * 0.05);
    });
  }

  // Content quality: puzzles flagged dislike+gave_up in the connections_feedback
  // table must not appear in the pool. Source of truth = supabase audit
  // 2026-04-29: 30 disliked rows, 27 already removed in prior sweeps, 3
  // stragglers still in he-easy.ts.
  it('he: removes puzzles flagged as dislike+gave_up by players', () => {
    const all = getPuzzlesForLocale('he');
    const ids = new Set(all.map((p) => p.id));
    for (const id of ['he-e-017', 'he-e-093', 'he-e-099']) {
      expect(ids.has(id)).toBe(false);
    }
  });

  it('en: pool length matches PUZZLES_BY_LOCALE', () => {
    expect(getTotalLevels('en')).toBe(getPuzzlesForLocale('en').length);
  });

  it('he: pool length matches PUZZLES_BY_LOCALE', () => {
    expect(getTotalLevels('he')).toBe(getPuzzlesForLocale('he').length);
  });
});
