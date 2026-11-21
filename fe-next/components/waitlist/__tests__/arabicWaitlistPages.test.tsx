import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));

import ArPage, { generateMetadata as arMeta } from '@/app/[locale]/laabat-kalimat-arabiya/page';
import EnPage, { generateMetadata as enMeta } from '@/app/[locale]/arabic-word-game/page';
import { AR_CANONICAL, arContent } from '@/app/[locale]/laabat-kalimat-arabiya/content';
import { EN_CANONICAL, enContent } from '@/app/[locale]/arabic-word-game/content';

const params = (locale: string) => ({ params: Promise.resolve({ locale }) });

describe.each([
  ['arabic', arMeta, AR_CANONICAL, EN_CANONICAL],
  ['english', enMeta, EN_CANONICAL, AR_CANONICAL],
])('%s waitlist page metadata', (_n, meta, canonical, sibling) => {
  it('is indexable only under /en and canonicalises there from every locale', async () => {
    for (const locale of ['en', 'he', 'es', 'ru']) {
      const m = await meta(params(locale));
      expect(m.alternates?.canonical).toBe(canonical);
      expect(m.robots).toEqual({ index: locale === 'en', follow: true });
    }
  });

  it('pairs with its sibling through reciprocal ar/en hreflang', async () => {
    const langs = (await meta(params('en'))).alternates?.languages as Record<string, string>;
    expect(Object.values(langs)).toEqual(expect.arrayContaining([canonical, sibling]));
    expect(langs.ar).toBeDefined();
    expect(langs.en).toBeDefined();
  });
});

describe.each([
  ['arabic', arContent, 'ar_waitlist_ar'],
  ['english', enContent, 'ar_waitlist_en'],
])('%s waitlist page content', (_n, content, source) => {
  it('tags signups with its own waitlist source', () => {
    expect(content.waitlist.source).toBe(source);
  });

  it('promises no launch date', () => {
    const text = JSON.stringify(content);
    expect(text).not.toMatch(/\b20\d\d\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
  });

  it('ships at least 4 FAQ entries', () => {
    expect(content.faqs.length).toBeGreaterThanOrEqual(4);
  });
});

describe('rendered pages', () => {
  it('arabic page renders right-to-left in Arabic with the waitlist form', async () => {
    const html = renderToStaticMarkup(await ArPage(params('en')));
    expect(html).toMatch(/<main[^>]*lang="ar"[^>]*dir="rtl"|<main[^>]*dir="rtl"[^>]*lang="ar"/);
    expect(html).toContain(arContent.h1);
    expect(html).toContain('type="email"');
    expect(html).toContain('"@type":"FAQPage"');
  });

  it('english page renders left-to-right and links to the Arabic page', async () => {
    const html = renderToStaticMarkup(await EnPage(params('en')));
    expect(html).toMatch(/<main[^>]*lang="en"/);
    expect(html).toContain('href="/en/laabat-kalimat-arabiya"');
    expect(html).toContain('type="email"');
  });
});
