import { describe, it, expect } from 'vitest';
import { RETIRED_MODE_REDIRECTS } from '@/lib/seo/retiredModeRedirects.mjs';

interface RedirectRule {
  source: string;
  destination: string;
  permanent: boolean;
}

const rules = RETIRED_MODE_REDIRECTS as RedirectRule[];
const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

describe('retired mode redirects', () => {
  it('sends old /blast/v2 links to the Blast game, per locale', () => {
    const rule = rules.find((r) => r.source.includes(':locale') && r.source.includes('/blast/v2'));
    expect(rule?.source).toBe('/:locale(en|he|sv|ja|es|ru)/blast/v2/:path*');
    expect(rule?.destination).toBe('/:locale/blast');
  });

  it('covers the locale-less /blast/v2 shape', () => {
    expect(rules.find((r) => r.source === '/blast/v2/:path*')?.destination).toBe('/en/blast');
  });

  it('lists every supported locale in the alternation', () => {
    for (const rule of rules.filter((r) => r.source.includes(':locale'))) {
      expect(rule.source.match(/:locale\(([^)]+)\)/)?.[1]?.split('|')).toEqual(LOCALES);
    }
  });

  it('is permanent, because the old URL existed and is gone for good', () => {
    for (const rule of rules) expect(rule.permanent).toBe(true);
  });

  it('never shadows the Blast route itself', () => {
    for (const rule of rules) expect(rule.source).not.toMatch(/\/blast(\/:path\*)?$/);
  });
});
