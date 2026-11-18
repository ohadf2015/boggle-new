import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import { generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { generatePageMetadata } from '../generatePageMetadata';
import { BODY_LOCALES, hasBodyInLocale, withBodyLocales } from '../bodyLocales';

const BASE = 'https://www.lexiclash.live';
const blogContent = import.meta.glob<{ contentByLocale: Record<string, unknown> }>(
  '/app/\\[locale\\]/blog/*/content.ts',
  { eager: true },
);

describe('body locales', () => {
  it('matches the languages each blog article is actually written in', () => {
    const entries = Object.entries(blogContent);
    expect(entries.length).toBeGreaterThan(20);
    for (const [file, mod] of entries) {
      const slug = file.split('/').at(-2);
      expect([...(BODY_LOCALES[`/blog/${slug}`] ?? [])].sort(), slug).toEqual(Object.keys(mod.contentByLocale).sort());
    }
  });

  it('noindexes a copy without a body and points it at a real one', () => {
    const meta = withBodyLocales(
      { robots: { index: true, follow: true }, alternates: { canonical: `${BASE}/ja/words`, languages: { ja: `${BASE}/ja/words`, 'en-JP': `${BASE}/en/words` } } },
      '/words',
      'ja',
    );
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe(`${BASE}/en/words`);
    expect(meta.alternates?.languages).toEqual({ 'en-JP': `${BASE}/en/words`, en: `${BASE}/en/words`, 'x-default': `${BASE}/en/words` });
  });

  it('keeps a translated copy indexable without hreflang to untranslated ones', () => {
    const meta = withBodyLocales(
      { robots: { index: true, follow: true }, alternates: { languages: { ru: `${BASE}/ru/glossary`, 'ru-RU': `${BASE}/ru/glossary` } } },
      '/glossary',
      'he',
    );
    expect(meta.robots).toEqual({ index: true, follow: true });
    expect(meta.alternates?.canonical).toBe(`${BASE}/he/glossary`);
    expect(Object.keys(meta.alternates?.languages ?? {}).sort()).toEqual(['en', 'he', 'x-default']);
  });

  it('noindexes a blog article with a translated title over an English body', () => {
    const meta = generateBlogMetadata({ slug: 'best-boggle-alternatives-2026', locale: 'es', title: 'Título', description: 'd', datePublished: '2025-12-01' });
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe(`${BASE}/en/blog/best-boggle-alternatives-2026`);
  });

  it('applies to pages built by the shared metadata helper', async () => {
    const meta = await generatePageMetadata({ seoKey: 'community', path: '/community', locale: 'ru' });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});

describe('sitemap quality', () => {
  const entries = sitemap();
  const pathOf = (url: string) => url.replace(BASE, '');

  it('lists only copies that have a real body, and hreflang never names one that does not', () => {
    for (const e of entries) {
      for (const url of [e.url, ...Object.values(e.alternates?.languages ?? {})]) {
        const [, locale, ...rest] = pathOf(String(url)).split('/');
        expect(hasBodyInLocale(rest.length ? `/${rest.join('/')}` : '', locale), String(url)).toBe(true);
      }
    }
  });

  it('leaves out support pages, word lists, the game lobby and the HTML sitemap', () => {
    const bad = entries.map((e) => pathOf(e.url)).filter((p) => /^\/[a-z]{2}\/(education\/(help|lists|duels|classroom-game)|multiplayer$|sitemap$)/.test(p));
    expect(bad).toEqual([]);
  });
});
