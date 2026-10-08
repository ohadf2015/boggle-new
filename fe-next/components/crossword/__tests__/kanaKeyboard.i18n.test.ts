import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

const LOCALES = { en, he, sv, ja, es, ru } as Record<string, { crossword: Record<string, unknown> }>;

describe('ja crossword input strings', () => {
  it.each(Object.keys(LOCALES))('%s has the kana keyboard toggle + IME input labels', (loc) => {
    const cw = LOCALES[loc].crossword;
    for (const key of ['kanaVoiced', 'kanaBasic', 'kanaInput']) {
      expect(typeof cw[key], `${loc}.crossword.${key}`).toBe('string');
      expect((cw[key] as string).length).toBeGreaterThan(0);
    }
    expect(cw.kanaVoiced).not.toBe(cw.kanaBasic);
  });
});
