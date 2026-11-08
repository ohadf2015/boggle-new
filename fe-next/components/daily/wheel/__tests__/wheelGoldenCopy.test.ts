/** The golden-word lines resolve in all six locales (never an English fallback). */
import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

const LOCALES = { en, he, sv, ja, es, ru } as unknown as Record<string, { wordWheel?: { golden?: Record<string, unknown> } }>;

describe('wordWheel.golden copy', () => {
  for (const [lang, bundle] of Object.entries(LOCALES)) {
    it(`${lang}: reveal, results line and share line exist`, () => {
      for (const key of ['reveal', 'found', 'share']) {
        expect(typeof bundle.wordWheel?.golden?.[key], `${lang}:${key}`).toBe('string');
      }
    });
  }
});
