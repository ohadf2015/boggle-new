import { describe, it, expect } from 'vitest';
import sitemap from './sitemap';

const LOCALES = ['he', 'en', 'sv', 'ja', 'es'] as const;
const BASE_URL = 'https://www.lexiclash.live';

describe('sitemap', () => {
  const routes = sitemap();

  it('registers the Android download landing page for every locale', () => {
    for (const locale of LOCALES) {
      const url = `${BASE_URL}/${locale}/download-word-game-android`;
      const entry = routes.find((r) => r.url === url);
      expect(entry, `missing sitemap entry for ${url}`).toBeDefined();
      // hreflang cluster present
      expect(entry?.alternates?.languages).toBeDefined();
    }
  });
});
