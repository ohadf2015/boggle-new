import { describe, it, expect } from 'vitest';
import { getPuzzlesForLocale } from '../puzzles';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

/**
 * When two puzzles show the SAME two tiles, both answers are correct.
 *
 * The pool contains genuine cases: OUT+[COME]+BACK and OUT+[SET]+BACK are both
 * real (outcome/comeback, outset/setback), as are OUT+[DOOR]+WAY / OUT+[RUN]+WAY
 * and ארוחת+[בוקר]+טוב / ארוחת+[ערב]+טוב. A player shown "OUT _ BACK" who types
 * SET has solved it, and must not lose one of their four attempts because the
 * row they happened to be served stores COME.
 *
 * So a shared tile pair is not a bug to be removed — it is a fact about the
 * language, and every puzzle in such a group must accept the whole group's
 * answers. This test fails if a new puzzle ever collides with an existing pair
 * without being cross-accepted.
 */
const norm = (s: string) => s.trim().toLowerCase();

describe('puzzles sharing the same tiles accept each other’s answers', () => {
  for (const locale of LOCALES) {
    it(`${locale}: no player is punished for the other correct answer`, () => {
      const byTiles = new Map<string, { id: string; bridge: string; accepted: string[] }[]>();

      for (const p of getPuzzlesForLocale(locale)) {
        const key = `${norm(p.word1)}||${norm(p.word2)}`;
        const entry = {
          id: p.id,
          bridge: norm(p.bridge),
          accepted: (p.acceptedAnswers ?? []).map(norm),
        };
        byTiles.set(key, [...(byTiles.get(key) ?? []), entry]);
      }

      const failures: string[] = [];
      for (const [tiles, group] of byTiles) {
        if (group.length < 2) continue;
        const everyAnswer = group.map((g) => g.bridge);
        for (const p of group) {
          const credits = new Set([p.bridge, ...p.accepted]);
          const missing = everyAnswer.filter((b) => !credits.has(b));
          if (missing.length) {
            failures.push(`${p.id} (${tiles}) rejects the equally-correct ${missing.join(', ')}`);
          }
        }
      }

      expect(failures, failures.join('\n')).toEqual([]);
    });
  }
});
