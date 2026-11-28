/**
 * One list of blog posts for every machine-readable surface: the article JSON-LD, the index
 * page's Blog schema, /sitemap.xml, /news-sitemap.xml and the per-locale RSS feeds.
 *
 * Dates and hero image come from lib/blog/manifest.ts, titles from lib/blog/data.ts, and the locales from
 * BODY_LOCALES, so the five surfaces can't disagree about when a post changed or which
 * languages it exists in. Each page.tsx reads its dates from here too.
 */
import { BODY_LOCALES } from '@/lib/seo/bodyLocales';
import { blogPostsContent } from './data';
import { BLOG_AUTHOR, blogPosts, getBlogPost, type BlogPost } from './manifest';

export { BLOG_AUTHOR, getBlogPost };

export const SITE_URL = 'https://www.lexiclash.live';
export const BLOG_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
export type BlogLocale = (typeof BLOG_LOCALES)[number];

/** Same @id as the site-wide Organization in app/[locale]/layout.tsx. */
export const BLOG_PUBLISHER = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'LexiClash',
  url: SITE_URL,
  logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png`, width: 512, height: 512 },
} as const;

/**
 * A page's robots replaces the root layout's, which is where max-image-preview:large lives.
 * Without it Google shows only a small thumbnail in Discover, News and Top Stories.
 */
export const INDEXABLE_ROBOTS = {
  index: true,
  follow: true,
  'max-image-preview': 'large',
  'max-snippet': -1,
  'max-video-preview': -1,
  googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
} as const;

/** 'YYYY-MM-DD' → ISO 8601 with an explicit UTC offset, as Google's Article docs recommend. */
export function toIsoDateTime(date: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00Z` : date;
}

/** Dates for a post's page.tsx; throws so a page that isn't in the manifest fails the build. */
export function getBlogPostDates(slug: string): { datePublished: string; dateModified: string } {
  const post = getBlogPost(slug);
  if (!post) throw new Error(`Blog post "${slug}" is missing from lib/blog/manifest.ts`);
  return { datePublished: post.date, dateModified: post.dateModified };
}

/**
 * The hero in the three aspect ratios Google asks for (16x9, 4x3, 1x1, all 1200px+ wide).
 * The 4x3 and 1x1 files are generated from the 16x9 hero into sibling folders.
 */
export function blogImageSet(slug: string): string[] {
  const hero = getBlogPost(slug)?.image ?? '/og-image-en.webp';
  const m = hero.match(/^\/images\/blog\/([^/]+)$/);
  if (!m) return [`${SITE_URL}${hero}`];
  return [`${SITE_URL}${hero}`, `${SITE_URL}/images/blog/4x3/${m[1]}`, `${SITE_URL}/images/blog/1x1/${m[1]}`];
}

/** Locales a post has a real, indexable body in. */
export function blogPostLocales(slug: string): BlogLocale[] {
  const declared = BODY_LOCALES[`/blog/${slug}`];
  return BLOG_LOCALES.filter((l) => (declared ? declared.includes(l) : true));
}

export interface BlogEntry {
  slug: string;
  locale: BlogLocale;
  url: string;
  title: string;
  summary: string;
  category: string;
  datePublished: string;
  dateModified: string;
  images: string[];
}

function toEntry(post: BlogPost, locale: BlogLocale): BlogEntry | null {
  const content = blogPostsContent[locale]?.posts[post.slug];
  if (!content || !blogPostLocales(post.slug).includes(locale)) return null;
  return {
    slug: post.slug,
    locale,
    url: `${SITE_URL}/${locale}/blog/${post.slug}`,
    title: content.title,
    summary: content.excerpt,
    category: content.category,
    datePublished: toIsoDateTime(post.date),
    dateModified: toIsoDateTime(post.dateModified),
    images: blogImageSet(post.slug),
  };
}

const newestFirst = (a: BlogEntry, b: BlogEntry) =>
  b.datePublished.localeCompare(a.datePublished) || a.slug.localeCompare(b.slug);

/** Indexable posts in one locale, newest first. */
export function getBlogEntries(locale: string): BlogEntry[] {
  if (!(BLOG_LOCALES as readonly string[]).includes(locale)) return [];
  return blogPosts
    .map((p) => toEntry(p, locale as BlogLocale))
    .filter((e): e is BlogEntry => e !== null)
    .sort(newestFirst);
}

/** Every indexable post in every locale, newest first. */
export function getAllBlogEntries(): BlogEntry[] {
  return BLOG_LOCALES.flatMap((l) => getBlogEntries(l)).sort(newestFirst);
}

export const blogFeedUrl = (locale: string) => `${SITE_URL}/${locale}/blog/feed.xml`;

/** Locales whose feed has at least one post. */
export function blogFeedLocales(): BlogLocale[] {
  return BLOG_LOCALES.filter((l) => getBlogEntries(l).length > 0);
}

/** Blog schema for /[locale]/blog: the publication and every post it lists. */
export function blogIndexJsonLd(locale: string) {
  const loc: BlogLocale = (BLOG_LOCALES as readonly string[]).includes(locale) ? (locale as BlogLocale) : 'en';
  const page = blogPostsContent[loc] ?? blogPostsContent.en;
  const url = `${SITE_URL}/${loc}/blog`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${url}#blog`,
    name: `LexiClash — ${page.pageTitle}`,
    description: page.pageSubtitle,
    url,
    inLanguage: loc,
    publisher: BLOG_PUBLISHER,
    blogPost: getBlogEntries(loc).map((e) => ({
      '@type': 'BlogPosting',
      headline: e.title,
      url: e.url,
      datePublished: e.datePublished,
      dateModified: e.dateModified,
      image: e.images,
      author: { '@type': 'Person', name: BLOG_AUTHOR.name, url: BLOG_AUTHOR.url },
    })),
  };
}
