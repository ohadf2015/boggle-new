import { describe, it, expect } from 'vitest';
import { SCHOOL_ROUTE_ALIASES } from '@/lib/seo/schoolRouteAliases.mjs';

interface RedirectRule {
  source: string;
  destination: string;
  permanent: boolean;
}

const rules = SCHOOL_ROUTE_ALIASES as RedirectRule[];
const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

describe('school route aliases', () => {
  it('sends /schools and /for-schools to the localized for-schools page', () => {
    for (const alias of ['schools', 'for-schools']) {
      const localized = rules.find((r) => r.source.endsWith(`/${alias}`) && r.source.includes(':locale'));
      expect(localized?.destination).toBe('/:locale/education/for-schools');
      expect(rules.find((r) => r.source === `/${alias}`)?.destination).toBe('/en/education/for-schools');
    }
  });

  it('lists every supported locale and stays a temporary, exact-segment alias', () => {
    for (const rule of rules) {
      expect(rule.permanent).toBe(false);
      expect(rule.source).toMatch(/^(\/:locale\(.+\))?\/(schools|for-schools)$/);
      if (rule.source.includes(':locale')) {
        expect(rule.source.match(/:locale\(([^)]+)\)/)?.[1]?.split('|')).toEqual(LOCALES);
      }
    }
  });
});
