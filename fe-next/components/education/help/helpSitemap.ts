import type { MetadataRoute } from 'next';
import { HELP_LOCALES } from './helpTypes';
import { HELP_PATH, HELP_SLUGS } from './helpRegistry';
import { helpAlternates, helpUrl } from './helpUrls';

export function helpSitemapEntries(lastModified: Date | string): MetadataRoute.Sitemap {
  const paths = [HELP_PATH, ...HELP_SLUGS.map((s) => `${HELP_PATH}/${s}`)];
  return paths.flatMap((path) =>
    HELP_LOCALES.map((locale) => ({
      url: helpUrl(locale, path),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: path === HELP_PATH ? 0.6 : 0.5,
      alternates: { languages: helpAlternates(path) },
    })),
  );
}
