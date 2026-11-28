/**
 * RSS 2.0 feed per locale and the Google News sitemap, both built from lib/blog/posts.
 */
import {
  BLOG_AUTHOR,
  SITE_URL,
  blogFeedUrl,
  getAllBlogEntries,
  getBlogEntries,
  type BlogEntry,
} from './posts';
import { blogPostsContent } from './data';

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const rfc822 = (iso: string) => new Date(iso).toUTCString();

function rssItem(e: BlogEntry): string {
  const [hero] = e.images;
  return [
    '    <item>',
    `      <title>${escapeXml(e.title)}</title>`,
    `      <link>${e.url}</link>`,
    `      <guid isPermaLink="true">${e.url}</guid>`,
    `      <description>${escapeXml(e.summary)}</description>`,
    `      <dc:creator>${escapeXml(BLOG_AUTHOR.name)}</dc:creator>`,
    `      <category>${escapeXml(e.category)}</category>`,
    `      <pubDate>${rfc822(e.datePublished)}</pubDate>`,
    `      <media:content url="${escapeXml(hero)}" medium="image" type="image/jpeg" />`,
    '    </item>',
  ].join('\n');
}

/** RSS 2.0 for one locale's blog, newest first. Null when the locale has no posts. */
export function buildBlogRss(locale: string): string | null {
  const entries = getBlogEntries(locale);
  if (entries.length === 0) return null;
  const page = blogPostsContent[locale] ?? blogPostsContent.en;
  const lastBuild = entries.map((e) => e.dateModified).sort().pop()!;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">',
    '  <channel>',
    `    <title>${escapeXml(`LexiClash — ${page.pageTitle}`)}</title>`,
    `    <link>${SITE_URL}/${locale}/blog</link>`,
    `    <description>${escapeXml(page.pageSubtitle)}</description>`,
    `    <language>${locale}</language>`,
    `    <lastBuildDate>${rfc822(lastBuild)}</lastBuildDate>`,
    `    <atom:link href="${blogFeedUrl(locale)}" rel="self" type="application/rss+xml" />`,
    '    <image>',
    `      <url>${SITE_URL}/icon-512.png</url>`,
    `      <title>${escapeXml(`LexiClash — ${page.pageTitle}`)}</title>`,
    `      <link>${SITE_URL}/${locale}/blog</link>`,
    '    </image>',
    ...entries.map(rssItem),
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

/** Google News accepts only articles published in the last two days, at most 1000. */
export const NEWS_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
export const NEWS_MAX_URLS = 1000;
export const NEWS_PUBLICATION_NAME = 'LexiClash';

export function buildNewsSitemap(now: Date = new Date()): string {
  const fresh = getAllBlogEntries()
    .filter((e) => {
      const age = now.getTime() - new Date(e.datePublished).getTime();
      return age >= 0 && age <= NEWS_WINDOW_MS;
    })
    .slice(0, NEWS_MAX_URLS);
  const urls = fresh.map((e) =>
    [
      '  <url>',
      `    <loc>${e.url}</loc>`,
      `    <lastmod>${e.dateModified}</lastmod>`,
      '    <news:news>',
      '      <news:publication>',
      `        <news:name>${NEWS_PUBLICATION_NAME}</news:name>`,
      `        <news:language>${e.locale}</news:language>`,
      '      </news:publication>',
      `      <news:publication_date>${e.datePublished}</news:publication_date>`,
      `      <news:title>${escapeXml(e.title)}</news:title>`,
      '    </news:news>',
      '  </url>',
    ].join('\n'),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}
