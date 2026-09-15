/**
 * Keys Sentry reported as "Translation missing" on production 2026-09-15:
 *  - JAVASCRIPT-NEXTJS-248/249/24A — VocabularyHeatmap legend on /teacher builds
 *    `education.analytics.${level}` for four levels; only `struggling` existed.
 *  - JAVASCRIPT-NEXTJS-20D — towerSurprise maps echo/meteor_strike/phantom_floor to
 *    `wordTower.surprise.*`; only es/ru had them.
 */
import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

const LOCALES = { en, he, sv, ja, es, ru } as Record<string, Record<string, unknown>>;

const KEYS = [
  'education.analytics.mastered',
  'education.analytics.practicing',
  'education.analytics.struggling',
  'education.analytics.notStarted',
  'wordTower.surprise.echo',
  'wordTower.surprise.meteorStrike',
  'wordTower.surprise.phantomFloor',
];

const get = (obj: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], obj);

describe('keys Sentry flagged as missing', () => {
  for (const [lang, dict] of Object.entries(LOCALES)) {
    it.each(KEYS)(`${lang}: %s resolves to a non-empty string`, (key) => {
      const value = get(dict, key);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });
  }
});
