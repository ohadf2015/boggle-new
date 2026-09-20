/**
 * Daily hub mode titles must be DISTINCT — and must be names.
 *
 * Found in prod on 2026-09-20, all four invisible to every existing parity test:
 *
 *   sv  wordTower.daily.questTitle = "Ordbro"  — identical to Word Bridge's
 *       title, so two hub cards shipped under one name.
 *   es  daily.wordHunt.title = "¡Eres un jugador destacado!"
 *   ru  daily.wordHunt.title = "Ты топ игрок!"   ← congratulation sentences
 *   he/sv daily.wordHunt.title = "Word Hunt"     ← never translated
 *
 * Why parity missed all of it: parity asserts a key EXISTS and is a non-empty
 * string in every locale. Every one of these passed — the strings were present,
 * non-empty and in the right script. A WRONG value is invisible to a presence
 * check, and a DUPLICATE value is invisible to a per-key check, because nothing
 * compares sibling keys to each other.
 *
 * So this asserts the two properties the hub actually depends on: within a
 * locale the four mode titles are pairwise distinct, and each reads as a short
 * label rather than a sentence.
 */

import { describe, it, expect } from 'vitest';

import { en } from '../translations/en.js';
import { he } from '../translations/he.js';
import { sv } from '../translations/sv.js';
import { ja } from '../translations/ja.js';
import { es } from '../translations/es.js';
import { ru } from '../translations/ru.js';

import { DAILY_MODES } from '../lib/dailyModes';

const LOCALES: Record<string, Record<string, unknown>> = { en, he, sv, ja, es, ru };

/** Resolve a dotted key path the way `t()` does. */
function resolve(bundle: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    bundle,
  );
}

describe('daily mode titles', () => {
  for (const [locale, bundle] of Object.entries(LOCALES)) {
    describe(locale, () => {
      it('resolves a non-empty string title for every mode', () => {
        for (const mode of DAILY_MODES) {
          const value = resolve(bundle, mode.titleKey);
          expect(typeof value, `${locale}: ${mode.titleKey} must resolve to a string`).toBe('string');
          expect((value as string).trim().length, `${locale}: ${mode.titleKey} must not be empty`).toBeGreaterThan(0);
        }
      });

      it('gives every mode a DIFFERENT title — two cards may never share a name', () => {
        const titles = DAILY_MODES.map((mode) => String(resolve(bundle, mode.titleKey)).trim());
        const seen = new Map<string, string>();
        for (const [i, title] of titles.entries()) {
          const clash = seen.get(title);
          expect(
            clash,
            `${locale}: "${title}" is used by both ${clash} and ${DAILY_MODES[i].id}`,
          ).toBeUndefined();
          seen.set(title, DAILY_MODES[i].id);
        }
      });

      it('uses short labels, not sentences pasted in from another string', () => {
        for (const mode of DAILY_MODES) {
          const title = String(resolve(bundle, mode.titleKey)).trim();
          // es/ru shipped "¡Eres un jugador destacado!" / "Ты топ игрок!" here.
          // A card title is a name: a handful of words and no sentence
          // punctuation. CJK titles are short by character count, so cap on
          // characters rather than whitespace-delimited words.
          expect(title.length, `${locale}: ${mode.id} title is too long to be a name: "${title}"`).toBeLessThanOrEqual(28);
          expect(title, `${locale}: ${mode.id} title reads as a sentence: "${title}"`).not.toMatch(/[!?¡¿]/);
        }
      });
    });
  }
});
