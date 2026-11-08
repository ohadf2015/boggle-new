/** The results-screen lines resolve in all six locales with the same placeholders (never an English fallback). */
import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

const LOCALES = { en, he, sv, ja, es, ru } as unknown as Record<string, Record<string, unknown>>;
const KEYS = ['results.bestMissedWord', 'results.rewardLine.coins', 'results.rewardLine.xp'];
const get = (o: unknown, k: string) => k.split('.').reduce<unknown>((a, p) => (a as Record<string, unknown> | undefined)?.[p], o);
const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe('results line translations', () => {
  for (const key of KEYS) {
    it(`${key} resolves in every locale with the English placeholders`, () => {
      const base = get(LOCALES.en, key) as string;
      expect(typeof base).toBe('string');
      for (const [lang, bundle] of Object.entries(LOCALES)) {
        const v = get(bundle, key);
        expect(typeof v, `${lang}:${key}`).toBe('string');
        expect(vars(v as string), `${lang}:${key}`).toEqual(vars(base));
      }
    });
  }
});
