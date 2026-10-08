import { describe, it, expect } from 'vitest';
import { getModePresentation } from '../modePresentation';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

const lookup = (bundle: unknown, key: string) =>
  key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], bundle);

describe('results mode tease keys', () => {
  it.each(['classic', 'blast', 'word-hunt', 'wheel-rush', 'word-tower', 'crossword'])(
    '%s label + hook resolve in all 6 locales',
    (mode) => {
      const { labelKey, hookKey } = getModePresentation(mode);
      for (const [lang, bundle] of Object.entries({ en, he, sv, ja, es, ru })) {
        expect(typeof lookup(bundle, labelKey), `${lang}:${labelKey}`).toBe('string');
        expect(typeof lookup(bundle, hookKey), `${lang}:${hookKey}`).toBe('string');
      }
    },
  );
});
