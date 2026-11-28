import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { blogPosts } from '../manifest';
import {
  SITE_URL,
  blogFeedLocales,
  blogImageSet,
  blogIndexJsonLd,
  blogPostLocales,
  getAllBlogEntries,
  getBlogEntries,
  getBlogPostDates,
  toIsoDateTime,
} from '../posts';

const FE_ROOT = join(__dirname, '..', '..', '..');
const BLOG_DIR = join(FE_ROOT, 'app', '[locale]', 'blog');
const postDirs = readdirSync(BLOG_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(BLOG_DIR, d.name, 'page.tsx')) && d.name !== 'feed.xml')
  .map((d) => d.name)
  .sort();

describe('blog manifest', () => {
  // Given every article directory under app/[locale]/blog
  // Then each one is in the manifest (or its page.tsx throws on getBlogPostDates), and nothing extra is.
  it('lists exactly the article pages on disk', () => {
    expect(blogPosts.map((p) => p.slug).sort()).toEqual(postDirs);
  });

  it('never has a post modified before it was published', () => {
    for (const p of blogPosts) {
      expect(p.date, p.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.dateModified >= p.date, p.slug).toBe(true);
    }
  });

  it('throws for a slug that is not in the manifest', () => {
    expect(() => getBlogPostDates('no-such-post')).toThrow(/manifest/);
    expect(getBlogPostDates('boggle-vs-wordle')).toEqual({ datePublished: '2026-03-28', dateModified: '2026-05-19' });
  });
});

describe('toIsoDateTime', () => {
  it('adds a UTC time to a bare date and leaves a full timestamp alone', () => {
    expect(toIsoDateTime('2026-03-28')).toBe('2026-03-28T00:00:00Z');
    expect(toIsoDateTime('2026-03-28T10:00:00+03:00')).toBe('2026-03-28T10:00:00+03:00');
  });
});

describe('blogImageSet', () => {
  it('gives 16x9, 4x3 and 1x1 versions of every hero, and each file exists', () => {
    for (const { slug } of blogPosts) {
      const set = blogImageSet(slug);
      expect(set, slug).toHaveLength(3);
      expect(set[1]).toContain('/images/blog/4x3/');
      expect(set[2]).toContain('/images/blog/1x1/');
      for (const url of set) {
        expect(existsSync(join(FE_ROOT, 'public', url.replace(SITE_URL, ''))), url).toBe(true);
      }
    }
  });
});

describe('getBlogEntries', () => {
  it('lists only posts with a real body in the locale, newest first', () => {
    const es = getBlogEntries('es').map((e) => e.slug);
    expect(es).toContain('alternativas-a-scrabble');
    expect(es).not.toContain('milat-hayom-habit');
    expect(getBlogEntries('he').map((e) => e.slug)).toContain('milat-hayom-habit');
    expect(getBlogEntries('en').map((e) => e.slug)).not.toContain('alternativas-a-scrabble');

    const dates = getBlogEntries('en').map((e) => e.datePublished);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('keeps untranslated articles out of Russian', () => {
    const ru = getBlogEntries('ru').map((e) => e.slug);
    expect(ru).toContain('free-word-games-online');
    expect(ru).not.toContain('boggle-vs-wordle');
    for (const slug of ru) expect(blogPostLocales(slug)).toContain('ru');
  });

  it('gives every entry a localized title, an absolute URL and ISO dates with a timezone', () => {
    for (const e of getAllBlogEntries()) {
      expect(e.title.length, e.url).toBeGreaterThan(0);
      expect(e.url).toBe(`${SITE_URL}/${e.locale}/blog/${e.slug}`);
      expect(e.datePublished).toMatch(/T\d{2}:\d{2}:\d{2}Z$/);
    }
  });

  it('is empty for a locale the site does not serve', () => {
    expect(getBlogEntries('fr')).toEqual([]);
  });

  it('includes the two June articles that were missing from the index', () => {
    const en = getBlogEntries('en').map((e) => e.slug);
    expect(en).toContain('ai-vs-word-games-language-learning');
    expect(en).toContain('spelling-bee-science-vocabulary');
  });

  it('has a feed for every served locale', () => {
    expect(blogFeedLocales()).toEqual(['en', 'he', 'sv', 'ja', 'es', 'ru']);
  });
});

describe('blogIndexJsonLd', () => {
  it('describes the locale blog with one BlogPosting per listed post', () => {
    const schema = blogIndexJsonLd('sv');
    expect(schema['@type']).toBe('Blog');
    expect(schema.url).toBe(`${SITE_URL}/sv/blog`);
    expect(schema.inLanguage).toBe('sv');
    expect(schema.publisher.logo.url).toBe(`${SITE_URL}/icon-512.png`);
    expect(schema.blogPost.map((p) => p.url)).toEqual(getBlogEntries('sv').map((e) => e.url));
    expect(schema.blogPost[0].author.name).toBe('Ohad Fisher');
  });

  it('falls back to English for an unknown locale', () => {
    expect(blogIndexJsonLd('xx').url).toBe(`${SITE_URL}/en/blog`);
  });
});
