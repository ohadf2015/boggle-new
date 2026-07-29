// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateMetadata, dailyWordHeFaqs, buildHamilaHayomitJsonLd } from './page';

const CANONICAL = 'https://www.lexiclash.live/he/hamila-hayomit';

describe('/he/hamila-hayomit metadata', () => {
  it('targets "המילה היומית" in title + description, canonical to /he', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'he' }) });
    expect(String(meta.title)).toContain('המילה היומית');
    expect(String(meta.description)).toContain('המילה היומית');
    expect(meta.alternates?.canonical).toBe(CANONICAL);
  });

  it('is indexable only on the he locale (locale-gate), canonical stays /he everywhere', async () => {
    const he = await generateMetadata({ params: Promise.resolve({ locale: 'he' }) });
    expect(he.robots).toEqual({ index: true, follow: true });

    for (const locale of ['en', 'es', 'sv', 'ja']) {
      const meta = await generateMetadata({ params: Promise.resolve({ locale }) });
      expect(meta.robots).toEqual({ index: false, follow: true });
      // non-he variants consolidate to the Hebrew canonical
      expect(meta.alternates?.canonical).toBe(CANONICAL);
    }
  });

  it('declares Hebrew hreflang + x-default and he_IL open graph', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'he' }) });
    const langs = meta.alternates?.languages ?? {};
    expect(langs['he']).toBe(CANONICAL);
    expect(langs['x-default']).toBeDefined();
    expect(meta.openGraph?.locale).toBe('he_IL');
  });
});

describe('/he/hamila-hayomit content', () => {
  it('ships at least 5 native Hebrew FAQ entries', () => {
    expect(dailyWordHeFaqs.length).toBeGreaterThanOrEqual(5);
    for (const f of dailyWordHeFaqs) {
      expect(f.q.trim().length).toBeGreaterThan(0);
      expect(f.a.trim().length).toBeGreaterThan(0);
    }
  });

  it('a definition-style FAQ names the target term', () => {
    const text = dailyWordHeFaqs.map((f) => `${f.q} ${f.a}`).join(' ');
    expect(text).toContain('המילה היומית');
  });
});

describe('/he/hamila-hayomit structured data (GEO)', () => {
  const blocks = buildHamilaHayomitJsonLd();

  it('emits a FAQPage whose questions match the FAQ list', () => {
    const faqPage = blocks.find((b) => b['@type'] === 'FAQPage');
    expect(faqPage).toBeDefined();
    expect(faqPage.mainEntity).toHaveLength(dailyWordHeFaqs.length);
  });

  it('emits a DefinedTerm that defines "המילה היומית" (AI-citation signal)', () => {
    const term = blocks.find((b) => b['@type'] === 'DefinedTerm');
    expect(term).toBeDefined();
    expect(term.name).toContain('המילה היומית');
    expect(String(term.description).length).toBeGreaterThan(0);
  });

  it('emits BreadcrumbList + WebApplication and links into the live daily game', () => {
    expect(blocks.find((b) => b['@type'] === 'BreadcrumbList')).toBeDefined();
    const app = blocks.find((b) => b['@type'] === 'WebApplication');
    expect(app).toBeDefined();
    expect(String(app.url)).toContain('/he/daily');
  });

  // The page injects JSON-LD as <script> text children (the safe-children approach).
  // This proves React's server renderer leaves the JSON parseable — quotes stay as "
  // (not the HTML entity), so schema.org parsers and AI crawlers can read the block.
  it('renders as valid, parseable JSON-LD via <script> text children', () => {
    const json = JSON.stringify(blocks);
    const html = renderToStaticMarkup(
      React.createElement('script', { type: 'application/ld+json' }, json),
    );
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).not.toContain('&quot;');
    const inner = html.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
    expect(() => JSON.parse(inner)).not.toThrow();
    expect(JSON.parse(inner)).toHaveLength(blocks.length);
  });
});
