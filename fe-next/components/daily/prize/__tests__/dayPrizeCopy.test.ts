/** The prize box speaks about today only: no "tomorrow could be bigger" teases, and the odds line exists in every locale. */
import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

const LOCALES = { en, he, sv, ja, es, ru } as unknown as Record<string, { daily?: { dayPrize?: Record<string, unknown> } }>;
const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe('daily.dayPrize copy', () => {
  for (const [lang, bundle] of Object.entries(LOCALES)) {
    it(`${lang}: no tease lines, a neutral today line and the odds line with all three numbers`, () => {
      const box = bundle.daily?.dayPrize ?? {};
      expect(box.lines).toBeUndefined();
      expect(typeof box.todayLine).toBe('string');
      expect(vars(box.odds as string)).toEqual(['{common}', '{jackpot}', '{lucky}']);
    });
  }

  it('en carries none of the removed teases', () => {
    const all = JSON.stringify(en);
    for (const tease of ["Tomorrow's box could be bigger", 'Only a few players get this one', 'See what tomorrow brings', 'Same time tomorrow?']) {
      expect(all).not.toContain(tease);
    }
  });
});
