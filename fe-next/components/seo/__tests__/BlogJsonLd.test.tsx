import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BlogPostingJsonLd, generateBlogMetadata } from '../BlogJsonLd';

const SITE = 'https://www.lexiclash.live';

function schemaOf(props: Partial<Parameters<typeof BlogPostingJsonLd>[0]> = {}) {
  const { container } = render(
    <BlogPostingJsonLd
      title="Boggle vs Wordle"
      description="d"
      slug="boggle-vs-wordle"
      locale="en"
      datePublished="2026-03-28"
      dateModified="2026-05-19"
      {...props}
    />,
  );
  return JSON.parse(container.querySelector('script')!.textContent!);
}

describe('BlogPostingJsonLd — Google Article requirements', () => {
  it('gives the hero in 16x9, 4x3 and 1x1', () => {
    expect(schemaOf().image).toEqual([
      `${SITE}/images/blog/boggle-vs-wordle.jpg`,
      `${SITE}/images/blog/4x3/boggle-vs-wordle.jpg`,
      `${SITE}/images/blog/1x1/boggle-vs-wordle.jpg`,
    ]);
  });

  it('writes both dates as ISO 8601 with a timezone', () => {
    const s = schemaOf();
    expect(s.datePublished).toBe('2026-03-28T00:00:00Z');
    expect(s.dateModified).toBe('2026-05-19T00:00:00Z');
  });

  it('names the author with a url to the canonical author page and links the site Organization as publisher', () => {
    const s = schemaOf();
    expect(s.author.name).toBe('Ohad Fisher');
    expect(s.author.url).toBe(`${SITE}/en/about/ohad-fisher`);
    expect(s.publisher['@id']).toBe(`${SITE}/#organization`);
    expect(s.publisher.logo.url).toBe(`${SITE}/icon-512.png`);
  });
});

describe('generateBlogMetadata', () => {
  const base = { slug: 'boggle-vs-wordle', locale: 'en', title: 't', description: 'd', datePublished: '2026-03-28', dateModified: '2026-05-19' };

  it('keeps max-image-preview:large, which a page-level robots would otherwise drop', () => {
    const robots = generateBlogMetadata(base).robots as Record<string, unknown>;
    expect(robots.index).toBe(true);
    expect(robots['max-image-preview']).toBe('large');
    expect((robots.googleBot as Record<string, unknown>)['max-image-preview']).toBe('large');
  });

  it('still noindexes an untranslated locale', () => {
    expect(generateBlogMetadata({ ...base, hasTranslation: false }).robots).toEqual({ index: false, follow: true });
  });

  it('links the locale RSS feed and uses ISO dates for article:published_time', () => {
    const meta = generateBlogMetadata({ ...base, locale: 'sv' });
    expect(meta.alternates?.types).toEqual({ 'application/rss+xml': `${SITE}/sv/blog/feed.xml` });
    const og = meta.openGraph as Record<string, unknown>;
    expect(og.publishedTime).toBe('2026-03-28T00:00:00Z');
    expect(og.modifiedTime).toBe('2026-05-19T00:00:00Z');
    expect(og.images).toEqual([{ url: `${SITE}/images/blog/boggle-vs-wordle.jpg`, alt: 't' }]);
  });
});
