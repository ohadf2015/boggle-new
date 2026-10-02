import type { Metadata } from 'next';
import type { PageLocale } from './model';
import { titleCase } from './i18n';
import { absoluteUrl, clusterAlternates } from './paths';

const OG_LOCALE: Record<string, string> = {
  en: 'en_US',
  he: 'he_IL',
  es: 'es_ES',
  sv: 'sv_SE',
  ja: 'ja_JP',
  ru: 'ru_RU',
};

const BRAND = ' | LexiClash';
/** Titles past ~60 characters get cut in results; the brand suffix goes first. */
function fitTitle(title: string): string {
  return title.length + BRAND.length <= 65 ? `${title}${BRAND}` : title;
}

export function wordListMetadata(opts: {
  locale: string;
  path: string;
  locales: readonly PageLocale[];
  title: string;
  description: string;
  /** Override for pages registered in EDUCATION_PAGES, whose sitemap entry uses the site-wide map. */
  languages?: Record<string, string>;
}): Metadata {
  const url = absoluteUrl(opts.locale, opts.path);
  const title = fitTitle(titleCase(opts.locale, opts.title));
  const ogImage = `https://www.lexiclash.live/og-image-${opts.locale === 'he' ? 'he' : 'en'}.webp`;
  return {
    title: { absolute: title },
    description: opts.description,
    alternates: { canonical: url, languages: opts.languages ?? clusterAlternates(opts.path, opts.locales) },
    openGraph: {
      type: 'website',
      url,
      title,
      description: opts.description,
      siteName: 'LexiClash',
      locale: OG_LOCALE[opts.locale] ?? 'en_US',
      images: [{ url: ogImage, width: 1200, height: 630, alt: opts.title }],
    },
    twitter: { card: 'summary_large_image', title, description: opts.description, images: [ogImage] },
    robots: { index: true, follow: true },
  };
}
