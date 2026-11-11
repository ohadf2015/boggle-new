import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import { generatePageMetadata } from '../generatePageMetadata';
import { ENGLISH_ONLY_BODY_PATHS } from '../englishOnlyBodyPages';
import { contentByLocale as about } from '@/app/[locale]/about/content';
import { contentByLocale as terms } from '@/app/[locale]/legal/terms/content';
import { contentByLocale as disclaimer } from '@/app/[locale]/legal/disclaimer/content';
import { contentByLocale as cookies } from '@/app/[locale]/legal/cookies/content';
import { contentByLocale as refund } from '@/app/[locale]/legal/refund/content';

const BASE = 'https://www.lexiclash.live';

// These pages render the English body under every locale, so /sv/legal/terms
// and friends were indexed as near copies of the /en page (audit, 2026-11-11).
describe('English-only body pages', () => {
  it('lists exactly the pages whose content has no translation', () => {
    // GIVEN each page's content module
    const byPath: Record<string, Record<string, unknown>> = {
      '/about': about,
      '/legal/terms': terms,
      '/legal/disclaimer': disclaimer,
      '/legal/cookies': cookies,
      '/legal/refund': refund,
    };
    // THEN the list matches, and each is English only. Translating one? Remove it from the list.
    expect([...ENGLISH_ONLY_BODY_PATHS].sort()).toEqual(Object.keys(byPath).sort());
    for (const content of Object.values(byPath)) {
      expect(Object.keys(content)).toEqual(['en']);
    }
  });

  it('noindexes the non-English copies and keeps hreflang on /en only', async () => {
    // WHEN metadata is built for the Swedish copy of an English-only page
    const sv = await generatePageMetadata({ seoKey: 'terms', path: '/legal/terms', locale: 'sv', englishOnly: true });
    // THEN it is noindex,follow and points search engines at the English page
    expect(sv.robots).toEqual({ index: false, follow: true });
    expect(sv.alternates?.canonical).toBe(`${BASE}/en/legal/terms`);
    expect(sv.alternates?.languages).toEqual({ 'x-default': `${BASE}/en/legal/terms`, en: `${BASE}/en/legal/terms` });
  });

  it('keeps the English page indexable', async () => {
    const en = await generatePageMetadata({ seoKey: 'terms', path: '/legal/terms', locale: 'en', englishOnly: true });
    expect(en.robots).toEqual({ index: true, follow: true });
    expect(en.alternates?.canonical).toBe(`${BASE}/en/legal/terms`);
  });

  it('lists only the /en URL of each page in the sitemap', () => {
    const urls = sitemap().map((e) => e.url);
    for (const path of ENGLISH_ONLY_BODY_PATHS) {
      const hits = urls.filter((u) => u.replace(BASE, '').replace(/^\/[a-z]{2}/, '') === path);
      expect(hits.every((u) => u === `${BASE}/en${path}`)).toBe(true);
    }
  });
});
