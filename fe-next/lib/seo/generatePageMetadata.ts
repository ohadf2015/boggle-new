import type { Metadata } from 'next';
import { loadTranslation } from '@/translations/loadTranslation';

const BASE_URL = 'https://www.lexiclash.live';
const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

type Locale = (typeof LOCALES)[number];

interface PageMetadataOptions {
  /** Key in seo translations object, e.g. 'adventure', 'contact' */
  seoKey: string;
  /** URL path segment after locale, e.g. '/adventure', '/legal/terms' */
  path: string;
  /** Current locale from params */
  locale: string;
  /** Whether to noindex this page (default: false) */
  noIndex?: boolean;
  /** OpenGraph type override (default: 'website') */
  ogType?: 'website' | 'article' | 'profile';
}

/**
 * Generate complete page metadata from translation SEO keys.
 * Centralizes the ~60 lines of boilerplate per page into one call.
 *
 * Usage in page.tsx or layout.tsx:
 * ```ts
 * export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 *   const { locale } = await params;
 *   return generatePageMetadata({ seoKey: 'adventure', path: '/adventure', locale });
 * }
 * ```
 */
export async function generatePageMetadata({
  seoKey,
  path,
  locale,
  noIndex = false,
  ogType = 'website',
}: PageMetadataOptions): Promise<Metadata> {
  const validLocale = (LOCALES.includes(locale as Locale) ? locale : 'en') as Locale;
  const t = (await loadTranslation(validLocale)) as Record<string, any>;
  const enT = (await loadTranslation('en')) as Record<string, any>;

  const seo = t?.seo?.[seoKey] || enT.seo[seoKey];
  if (!seo) {
    // Missing seoKey: synthesize a unique title/description from the path so
    // crawlers don't see identical root-inherited metadata across pages.
    const slug = (path.replace(/^\/+/, '').replace(/[-/]+/g, ' ').trim()) || 'home';
    const pretty = slug.replace(/\b\w/g, (c) => c.toUpperCase());
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[generatePageMetadata] missing seo key "${seoKey}" for path "${path}" (locale=${locale})`);
    }
    return {
      title: `${pretty} | LexiClash`,
      description: `LexiClash ${pretty} — free multiplayer word game. Play instantly, no download required.`,
      alternates: {
        canonical: `${BASE_URL}/${locale}${path}`,
        languages: Object.fromEntries(LOCALES.map((l) => [l, `${BASE_URL}/${l}${path}`])),
      },
      robots: noIndex ? { index: false, follow: true } : { index: true, follow: true },
    };
  }

  const baseSeo = t?.seo || enT.seo;
  const fullPath = `/${locale}${path}`;

  const ogImageMap: Record<string, string> = {
    en: 'og-image-en.webp', he: 'og-image-he.webp',
    sv: 'og-image-sv.webp', ja: 'og-image-ja.webp', es: 'og-image-es.webp',
  };
  const ogImage = `https://www.lexiclash.live/${ogImageMap[validLocale] || 'og-image-en.webp'}`;

  const alternateLanguages: Record<string, string> = {
    'x-default': `${BASE_URL}/en${path}`,
  };
  for (const l of LOCALES) {
    alternateLanguages[l] = `${BASE_URL}/${l}${path}`;
  }
  // Extended locale variants
  const extendedMappings: Record<string, string> = {
    'en-IL': 'en', 'he-IL': 'he', 'en-US': 'en', 'es-US': 'es',
    'en-GB': 'en', 'en-SE': 'en', 'sv-SE': 'sv', 'en-JP': 'en',
    'ja-JP': 'ja', 'en-ES': 'en', 'es-ES': 'es', 'en-MX': 'en',
    'es-MX': 'es', 'en-AU': 'en', 'es-AR': 'es', 'es-CO': 'es',
    'ru-RU': 'ru',
  };
  for (const [ext, base] of Object.entries(extendedMappings)) {
    alternateLanguages[ext] = `${BASE_URL}/${base}${path}`;
  }

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: ogType,
      locale: baseSeo.locale,
      url: `${BASE_URL}${fullPath}`,
      title: seo.ogTitle || seo.title,
      description: seo.ogDescription || seo.description,
      siteName: 'LexiClash',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: 'LexiClash - Multiplayer Word Game',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.ogTitle || seo.title,
      description: seo.ogDescription || seo.description,
      images: [ogImage],
    },
    alternates: {
      canonical: `${BASE_URL}${fullPath}`,
      languages: alternateLanguages,
    },
    // noindex,follow (not nofollow): keeps outbound links passing crawl signal
    // from noindexed shells — same convention as /anagram/[letters].
    robots: noIndex ? { index: false, follow: true } : { index: true, follow: true },
  };
}
