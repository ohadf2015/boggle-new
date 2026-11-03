// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Page, { generateMetadata } from './page';
import { CANONICAL, faqs, buildJsonLd } from './seo';

describe('/he/mischaqey-safa-imun-kogniti metadata', () => {
  it('targets both queries in title and description, canonical to /he', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'he' }) });
    for (const field of [String(meta.title), String(meta.description)]) {
      expect(field).toContain('משחקי שפה');
      expect(field).toContain('אימון קוגניטיבי');
    }
    expect(meta.alternates?.canonical).toBe(CANONICAL);
    expect(meta.openGraph?.locale).toBe('he_IL');
  });

  it('is indexable only on he; other locales consolidate to the Hebrew canonical', async () => {
    const he = await generateMetadata({ params: Promise.resolve({ locale: 'he' }) });
    expect(he.robots).toEqual({ index: true, follow: true });
    for (const locale of ['en', 'es', 'sv', 'ja', 'ru']) {
      const meta = await generateMetadata({ params: Promise.resolve({ locale }) });
      expect(meta.robots).toEqual({ index: false, follow: true });
      expect(meta.alternates?.canonical).toBe(CANONICAL);
    }
  });
});

describe('/he/mischaqey-safa-imun-kogniti content', () => {
  it('makes no clinical promise', () => {
    const text = faqs.map((f) => `${f.q} ${f.a}`).join(' ');
    for (const claim of ['מונע דמנציה', 'מונע אלצהיימר', 'מרפא', 'מוכח קלינית', 'משפר IQ']) {
      expect(text).not.toContain(claim);
    }
  });

  it('renders RTL with every FAQ visible and links into real games', async () => {
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ locale: 'he' }) }));
    expect(html).toContain('dir="rtl"');
    for (const f of faqs) expect(html).toContain(f.q);
    for (const href of ['/he/brain', '/he/multiplayer', '/he/daily', '/he/brain/drills/memory-hunt']) {
      expect(html).toContain(`href="${href}"`);
    }
  });
});

describe('/he/mischaqey-safa-imun-kogniti structured data', () => {
  const blocks = buildJsonLd();

  it('emits Article, FAQPage matching the visible FAQ, and a breadcrumb', () => {
    expect(blocks.find((b) => b['@type'] === 'Article')).toBeDefined();
    expect(blocks.find((b) => b['@type'] === 'BreadcrumbList')).toBeDefined();
    const faqPage = blocks.find((b) => b['@type'] === 'FAQPage') as { mainEntity: Array<{ name: string }> };
    expect(faqPage.mainEntity.map((q) => q.name)).toEqual(faqs.map((f) => f.q));
  });

  it('server-renders as parseable JSON-LD', async () => {
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ locale: 'he' }) }));
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    expect(JSON.parse(match![1])).toHaveLength(blocks.length);
  });
});
