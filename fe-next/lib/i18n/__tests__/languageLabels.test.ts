/**
 * The lobby asked `t('joinView.undefined')` for a Russian room.
 *
 * Both lobby language chips built their code→label map inline with five
 * entries. `ru` is a shipped locale, so the host chip's `Record<Language, …>`
 * cast returned undefined and rendered the raw key (Sentry
 * JAVASCRIPT-NEXTJS-1RH, 41 events / 2 users); the tutorial panel's own
 * five-entry list quietly dropped Russian from its switcher.
 *
 * These tests walk the shared map against the canonical locale list, so a
 * seventh locale fails here instead of in production.
 */
import { describe, it, expect } from 'vitest';
import { locales } from '@/i18n/config';
import {
  LANGUAGE_LABEL_KEYS,
  LANGUAGE_FLAGS,
  languageLabelKey,
  languageFlag,
} from '../languageLabels';
import { en } from '../../../translations/en.js';
import { he } from '../../../translations/he.js';
import { sv } from '../../../translations/sv.js';
import { ja } from '../../../translations/ja.js';
import { es } from '../../../translations/es.js';
import { ru } from '../../../translations/ru.js';

const LOCALE_DICTS: Record<string, unknown> = { en, he, sv, ja, es, ru };

function resolve(dict: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined,
      dict
    );
}

describe('language labels', () => {
  it('covers every shipped locale', () => {
    expect(Object.keys(LANGUAGE_LABEL_KEYS).sort()).toEqual([...locales].sort());
    expect(Object.keys(LANGUAGE_FLAGS).sort()).toEqual([...locales].sort());
  });

  for (const loc of locales) {
    it(`resolves a real label for ${loc} in every locale file`, () => {
      const key = languageLabelKey(loc);
      expect(key).not.toContain('undefined');
      for (const [dictName, dict] of Object.entries(LOCALE_DICTS)) {
        const value = resolve(dict, key);
        expect(value, `${dictName} is missing ${key}`).toBeTypeOf('string');
        expect((value as string).trim(), `${dictName}'s ${key} is empty`).not.toBe('');
      }
    });

    it(`has a flag for ${loc}`, () => {
      expect(languageFlag(loc).trim()).not.toBe('');
    });
  }

  // `Language` (room/board) is 8-wide — it adds fr/de the UI does not ship — so
  // the lookups must degrade instead of composing a `.undefined` key.
  for (const unmapped of ['fr', 'de', '', 'zz']) {
    it(`falls back for the unmapped code "${unmapped}"`, () => {
      expect(languageLabelKey(unmapped)).toBe(LANGUAGE_LABEL_KEYS.en);
      expect(languageFlag(unmapped)).toBe('🌐');
    });
  }

  it('labels Russian as Russian', () => {
    expect(languageLabelKey('ru')).toBe('languages.russian');
    expect(resolve(ru, languageLabelKey('ru'))).toBe('Русский');
  });
});
