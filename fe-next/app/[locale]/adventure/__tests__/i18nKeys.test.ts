import { describe, expect, it } from 'vitest';
import { en } from '@/translations/en.js';
import { es } from '@/translations/es.js';
import { he } from '@/translations/he.js';
import { ja } from '@/translations/ja.js';
import { ru } from '@/translations/ru.js';
import { sv } from '@/translations/sv.js';

const LOCALES = { en, es, he, ja, ru, sv } as Record<string, Record<string, unknown>>;

function get(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

const keys = [
  'adventure.loading',
  'adventure.backToMap',
];

describe('adventure i18n keys used on gated surfaces', () => {
  for (const [lang, dict] of Object.entries(LOCALES)) {
    it(`given ${lang}, when gated-surface keys are looked up, then each is a non-empty string`, () => {
      const missing = keys.filter((k) => typeof get(dict, k) !== 'string' || !(get(dict, k) as string).trim());
      expect(missing).toEqual([]);
    });
  }
});
