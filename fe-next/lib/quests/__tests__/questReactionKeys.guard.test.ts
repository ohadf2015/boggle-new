import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';
import { QUEST_REACTIONS } from '../questReactions';

const LOCALES: Record<string, unknown> = { en, he, es, sv, ja, ru };
const get = (o: unknown, key: string) =>
  key.split('.').reduce<unknown>((acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined), o);

describe('quest reaction cheers resolve in every locale', () => {
  const keys = Object.values(QUEST_REACTIONS).flatMap((p) => p.cheers);
  for (const [loc, dict] of Object.entries(LOCALES)) {
    it(`${loc} has every cheer`, () => {
      const missing = keys.filter((k) => typeof get(dict, k) !== 'string');
      expect(missing).toEqual([]);
    });
  }
});
