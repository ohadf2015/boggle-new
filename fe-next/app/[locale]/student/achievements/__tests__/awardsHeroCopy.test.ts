import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

const KEYS = ['awardsWon', 'awardsOfTotal', 'awardsNextUp', 'awardsToTier', 'awardsAllMaxed', 'awardsTierCount'];
const LOCALES = { en, he, sv, ja, es, ru } as unknown as Record<string, { academy: { pages: Record<string, string> } }>;

describe('awards hero copy', () => {
  for (const [locale, bundle] of Object.entries(LOCALES)) {
    it(`given the ${locale} catalogue, when the hero reads its keys, then every key is a real string`, () => {
      for (const key of KEYS) expect(typeof bundle.academy.pages[key], `${locale}.${key}`).toBe('string');
      expect(bundle.academy.pages.awardsToTier).toContain('{left}');
      expect(bundle.academy.pages.awardsToTier).toContain('{tier}');
      expect(bundle.academy.pages.awardsOfTotal).toContain('{total}');
    });
  }
});
