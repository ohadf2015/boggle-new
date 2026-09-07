/**
 * Every language the Create Classroom dropdown offers must have a label.
 *
 * Live: the dropdown rendered the raw key `languages.russian` to a teacher on
 * the English site. `ru` is a shipped locale and `LANGUAGE_LABEL_KEYS` names a
 * key for it, but `languages.russian` existed in NONE of the six files — so
 * every locale agreed, and the locale-parity contract (which compares key SETS
 * between locales) passed with the key missing everywhere.
 *
 * That is the blind spot: parity proves the files MATCH, never that a key a
 * component actually asks for EXISTS. This test closes it for this dropdown by
 * walking the component's own map, so adding a seventh language fails here
 * until its label is written in all six.
 */
import { describe, it, expect } from 'vitest';
import { LANGUAGE_LABEL_KEYS } from '../ClassroomManager';
import { en } from '../../../translations/en.js';
import { he } from '../../../translations/he.js';
import { sv } from '../../../translations/sv.js';
import { ja } from '../../../translations/ja.js';
import { es } from '../../../translations/es.js';
import { ru } from '../../../translations/ru.js';

const LOCALES: Record<string, unknown> = { en, he, sv, ja, es, ru };

function resolve(dict: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (node, key) =>
      node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined,
    dict
  );
}

describe('Create Classroom language labels', () => {
  it('offers every shipped locale', () => {
    // A dropdown that silently omits a language is its own bug.
    expect(Object.keys(LANGUAGE_LABEL_KEYS).sort()).toEqual(['en', 'es', 'he', 'ja', 'ru', 'sv']);
  });

  for (const [code, key] of Object.entries(LANGUAGE_LABEL_KEYS)) {
    it(`resolves ${key} (${code}) in every locale`, () => {
      for (const [locale, dict] of Object.entries(LOCALES)) {
        const value = resolve(dict, key);
        expect(value, `${locale} is missing ${key}`).toBeTypeOf('string');
        expect((value as string).trim(), `${locale}'s ${key} is empty`).not.toBe('');
        // The raw key path leaking through as the VALUE is the same bug.
        expect(value, `${locale}'s ${key} is the key itself`).not.toBe(key);
      }
    });
  }
});
