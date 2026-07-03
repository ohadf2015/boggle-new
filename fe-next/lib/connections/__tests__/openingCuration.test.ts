import { describe, it, expect } from 'vitest';
import { getPuzzleForLevel, getPuzzlesForLocale, getTotalLevels, CURATED_OPENING } from '../puzzles';

/**
 * The first puzzles a new player sees are the level-progression path
 * (getPuzzleForLevel → ORDERED_BY_LOCALE), NOT the daily. Players complained the
 * opening felt "too easy / too obvious" because the easy band led with the most
 * generic compounding morphemes (BACK / BALL / OUT). The fix is a hand-vetted
 * opening list of approachable-but-delightful "aha" puzzles that leads each
 * curated locale. This suite pins that contract.
 */
describe('curated opening — leads the level path with the good puzzles', () => {
  for (const locale of ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const) {
    const opening = CURATED_OPENING[locale] ?? [];

    it(`${locale}: defines a non-trivial curated opening`, () => {
      expect(opening.length).toBeGreaterThanOrEqual(6);
    });

    it(`${locale}: every curated id exists in the pool and is difficulty "easy"`, () => {
      const byId = new Map(getPuzzlesForLocale(locale).map((p) => [p.id, p]));
      for (const id of opening) {
        const p = byId.get(id);
        expect(p, `curated opening id ${id} must exist in ${locale} pool`).toBeTruthy();
        expect(p!.difficulty, `curated opening id ${id} must be easy`).toBe('easy');
      }
    });

    it(`${locale}: curated ids have no duplicates`, () => {
      expect(new Set(opening).size).toBe(opening.length);
    });

    it(`${locale}: the first N levels are exactly the curated opening, in order`, () => {
      opening.forEach((id, i) => {
        const p = getPuzzleForLevel(locale, i + 1);
        expect(p, `level ${i + 1} should be present`).toBeTruthy();
        expect(p!.id, `level ${i + 1} should be curated opener #${i + 1}`).toBe(id);
      });
    });

    it(`${locale}: opening never places the same bridge / stem back-to-back`, () => {
      const byId = new Map(getPuzzlesForLocale(locale).map((p) => [p.id, p]));
      for (let i = 1; i < opening.length; i++) {
        const prev = byId.get(opening[i - 1])!;
        const cur = byId.get(opening[i])!;
        expect(cur.bridge).not.toBe(prev.bridge);
        expect(cur.word1).not.toBe(prev.word1);
        expect(cur.word2).not.toBe(prev.word2);
      }
    });
  }

  it('curated opening is a pure reordering — no puzzle added or dropped', () => {
    for (const locale of ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const) {
      expect(getTotalLevels(locale)).toBe(getPuzzlesForLocale(locale).length);
    }
  });

  it('every pooled locale now has a curated opening (2026-07-03 sweep)', () => {
    for (const locale of ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const) {
      expect(CURATED_OPENING[locale]?.length ?? 0).toBeGreaterThanOrEqual(8);
      expect(getPuzzleForLevel(locale, 1)).toBeTruthy();
    }
  });
});
