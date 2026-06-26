import { describe, it, expect } from 'vitest';
import { ALCHEMY_OPS, PUZZLES } from '../engine';

/**
 * Word Alchemy i18n coverage — every op label and every puzzle clue key must
 * exist in all 5 locales. Catches drift when a puzzle is added but a locale
 * file is missed (which would render the literal key path to admins).
 */

const LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;

async function loadLocale(l: string): Promise<Record<string, unknown>> {
  const mod = await import(`../../../../translations/${l}.js`);
  // translations/<l>.js does `export { <l> }` — pick the named export.
  return (mod[l] ?? mod.default ?? mod) as Record<string, unknown>;
}

function pickWa(m: Record<string, unknown>): { ops?: Record<string, string>; clues?: Record<string, string>; adminOnly?: string; streak?: string } {
  return (m.wordAlchemy ?? {}) as { ops?: Record<string, string>; clues?: Record<string, string>; adminOnly?: string; streak?: string };
}

describe('wordAlchemy i18n — ops + clues coverage', () => {
  for (const l of LOCALES) {
    it(`${l} has every op label`, async () => {
      const wa = pickWa(await loadLocale(l));
      for (const op of ALCHEMY_OPS) {
        expect(wa.ops?.[op], `${l} missing ops.${op}`).toBeTruthy();
      }
    });

    it(`${l} has every puzzle clue key`, async () => {
      const wa = pickWa(await loadLocale(l));
      const needed = Array.from(
        new Set(
          PUZZLES.flatMap((p) => p.steps)
            .map((s) => s.clueKey)
            .filter((k): k is string => Boolean(k))
            .map((k) => k.replace(/^wordAlchemy\.clues\./, '')),
        ),
      );
      for (const k of needed) {
        expect(wa.clues?.[k], `${l} missing clues.${k}`).toBeTruthy();
      }
    });

    it(`${l} has adminOnly + streak labels`, async () => {
      const wa = pickWa(await loadLocale(l));
      expect(wa.adminOnly, `${l} missing adminOnly`).toBeTruthy();
      expect(wa.streak, `${l} missing streak`).toBeTruthy();
    });
  }
});
