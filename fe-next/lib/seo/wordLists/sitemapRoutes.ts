import { WORD_LIST_INDEXING } from './indexPolicy';
import type { MetadataRoute } from 'next';
import { getCatalog } from './catalog';
import type { PageLocale } from './model';
import { absoluteUrl, clusterAlternates, gradeHubPath, langHubPath, listPath, topicHubPath } from './paths';

/** Every word-list page in every locale it renders in, with the same cluster its head declares. */
export function wordListSitemapRoutes(lastModified: string): MetadataRoute.Sitemap {
  const c = getCatalog();
  const pages: Array<{ path: string; locales: PageLocale[]; priority: number }> = [
    // Only tiers that ask to be indexed (indexPolicy.ts) — a noindex URL in the sitemap is a contradiction.
    ...(WORD_LIST_INDEXING.langHubs ? c.langHubs.map((h) => ({ path: langHubPath(h.lang), locales: h.locales, priority: 0.75 })) : []),
    ...(WORD_LIST_INDEXING.gradeHubs ? c.gradeHubs.map((h) => ({ path: gradeHubPath(h.lang, h.grade), locales: h.locales, priority: 0.7 })) : []),
    ...(WORD_LIST_INDEXING.topicHubs ? c.topicHubs.map((h) => ({ path: topicHubPath(h.topic), locales: h.locales, priority: 0.7 })) : []),
    ...(WORD_LIST_INDEXING.lists ? c.lists.map((l) => ({ path: listPath(l), locales: l.locales, priority: 0.6 })) : []),
  ];
  return pages.flatMap((p) =>
    p.locales.map((locale) => ({
      url: absoluteUrl(locale, p.path),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: p.priority,
      alternates: { languages: clusterAlternates(p.path, p.locales) },
    })),
  );
}
