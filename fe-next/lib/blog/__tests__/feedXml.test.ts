import { describe, it, expect } from 'vitest';
import { buildBlogRss, buildNewsSitemap, escapeXml, NEWS_WINDOW_MS } from '../feedXml';
import { getAllBlogEntries, getBlogEntries } from '../posts';

const count = (xml: string, tag: string) => xml.split(`<${tag}>`).length - 1;

describe('escapeXml', () => {
  it('escapes the five XML specials', () => {
    expect(escapeXml(`a & b < c > "d" 'e'`)).toBe('a &amp; b &lt; c &gt; &quot;d&quot; &apos;e&apos;');
  });
});

describe('buildBlogRss', () => {
  it('returns an RSS 2.0 channel with one item per indexable post in the locale', () => {
    const xml = buildBlogRss('en')!;
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<atom:link href="https://www.lexiclash.live/en/blog/feed.xml" rel="self" type="application/rss+xml" />');
    expect(xml).toContain('<language>en</language>');
    expect(count(xml, 'item')).toBe(getBlogEntries('en').length);
  });

  it('lists the newest post first with its link, RFC 822 date, author and hero image', () => {
    const [newest] = getBlogEntries('en');
    const xml = buildBlogRss('en')!;
    const firstItem = xml.slice(xml.indexOf('<item>'), xml.indexOf('</item>'));
    expect(firstItem).toContain(`<link>${newest.url}</link>`);
    expect(firstItem).toContain(`<guid isPermaLink="true">${newest.url}</guid>`);
    expect(firstItem).toContain(`<pubDate>${new Date(newest.datePublished).toUTCString()}</pubDate>`);
    expect(firstItem).toContain('<dc:creator>Ohad Fisher</dc:creator>');
    expect(firstItem).toContain(`<media:content url="${newest.images[0]}"`);
  });

  it('escapes titles (the English feed has an apostrophe-quoted word)', () => {
    const xml = buildBlogRss('en')!;
    expect(xml).toContain('&apos;QI.&apos;');
    expect(xml).not.toMatch(/<title>[^<]*'[^<]*<\/title>/);
  });

  it('builds a Hebrew feed with Hebrew-only posts and no Spanish-only ones', () => {
    const xml = buildBlogRss('he')!;
    expect(xml).toContain('/he/blog/milat-hayom-habit');
    expect(xml).not.toContain('alternativas-a-scrabble');
  });

  it('returns null for a locale without a blog', () => {
    expect(buildBlogRss('fr')).toBeNull();
  });
});

describe('buildNewsSitemap', () => {
  const newest = getAllBlogEntries()[0];
  const published = new Date(newest.datePublished).getTime();

  it('uses the Google News namespace and lists a post published in the last two days', () => {
    const xml = buildNewsSitemap(new Date(published + 24 * 3600 * 1000));
    expect(xml).toContain('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"');
    expect(xml).toContain(`<loc>${newest.url}</loc>`);
    expect(xml).toContain('<news:name>LexiClash</news:name>');
    expect(xml).toContain(`<news:language>${newest.locale}</news:language>`);
    expect(xml).toContain(`<news:publication_date>${newest.datePublished}</news:publication_date>`);
    expect(xml).toContain(`<news:title>${escapeXml(newest.title)}</news:title>`);
  });

  it('drops posts older than two days, so a quiet week gives an empty but valid urlset', () => {
    const xml = buildNewsSitemap(new Date(published + NEWS_WINDOW_MS + 1000));
    expect(xml).not.toContain(newest.url);
    expect(xml).toContain('<urlset');
    expect(xml).toContain('</urlset>');
  });

  it('does not list a post dated in the future', () => {
    expect(buildNewsSitemap(new Date(published - 1000))).not.toContain(`<loc>${newest.url}</loc>`);
  });
});
