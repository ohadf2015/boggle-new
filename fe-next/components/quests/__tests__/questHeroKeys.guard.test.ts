import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';

const LOCALES: Record<string, unknown> = { en, he, es, sv, ja, ru };
const KEYS = ['quests.hero.fresh', 'quests.hero.one', 'quests.hero.two', 'quests.hero.done', 'quests.resetIn'];
const get = (o: unknown, key: string) =>
  key.split('.').reduce<unknown>((acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined), o);

describe('quest hero copy resolves in every locale', () => {
  for (const [loc, dict] of Object.entries(LOCALES)) {
    it(`${loc} has every hero key`, () => {
      expect(KEYS.filter((k) => typeof get(dict, k) !== 'string')).toEqual([]);
      expect(get(dict, 'quests.resetIn')).toContain('{{time}}');
    });
  }
});
