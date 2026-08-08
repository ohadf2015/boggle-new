import type { Metadata } from 'next';
import Script from 'next/script';
import ConnectionsPageClient from './PageClient';
import {
  SUPPORTED_LANDING_LOCALES,
  getConnectionsLandingCopy,
  isSupportedLandingLocale,
} from './content';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://www.lexiclash.live';

const OG_IMAGE: Record<string, string> = {
  en: 'og-image-en.webp',
  he: 'og-image-he.webp',
  sv: 'og-image-en.webp',
  ja: 'og-image-ja.webp',
  es: 'og-image-en.webp',
  ru: 'og-image-en.webp',
};

const OG_LOCALE: Record<string, string> = {
  en: 'en_US',
  he: 'he_IL',
  sv: 'sv_SE',
  ja: 'ja_JP',
  es: 'es_ES',
  ru: 'ru_RU',
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = getConnectionsLandingCopy(locale);
  const supported = isSupportedLandingLocale(locale);
  const pageUrl = `${BASE_URL}/${locale}/connections`;
  const canonical = supported ? pageUrl : `${BASE_URL}/en/connections`;
  const ogImage = `${BASE_URL}/${OG_IMAGE[locale] ?? OG_IMAGE.en}`;

  const languageMap: Record<string, string> = {
    'x-default': `${BASE_URL}/en/connections`,
  };
  SUPPORTED_LANDING_LOCALES.forEach((l) => {
    languageMap[l] = `${BASE_URL}/${l}/connections`;
  });

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    keywords: copy.metaKeywords,
    openGraph: {
      title: copy.ogTitle,
      description: copy.ogDescription,
      locale: OG_LOCALE[locale] ?? 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: ogImage, width: 1200, height: 630, alt: copy.ogTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.twitterTitle,
      description: copy.twitterDescription,
      images: [ogImage],
    },
    alternates: {
      canonical,
      languages: languageMap,
    },
    robots: { index: supported, follow: true },
  };
}

export default async function ConnectionsPage({ params }: PageProps) {
  const { locale } = await params;
  const copy = getConnectionsLandingCopy(locale);
  const supported = isSupportedLandingLocale(locale);

  const faqJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: copy.faq.items.map((entry) => ({
      '@type': 'Question',
      name: entry.q,
      acceptedAnswer: { '@type': 'Answer', text: entry.a },
    })),
  });

  const videoGameJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: copy.videoGameName,
    // Every localized name of the same game — helps search engines resolve
    // "和同開珎" / "Мост слов" / "Ordbron" to one entity instead of six.
    alternateName: [
      'Word Bridge',
      'rosh-zanav',
      'ראש זנב',
      'Ordbron',
      '漢字ブリッジ',
      '和同開珎',
      'Palabra Puente',
      'Мост слов',
    ],
    url: `${BASE_URL}/${locale}/connections`,
    description: copy.videoGameDescription,
    image: `${BASE_URL}/${OG_IMAGE[locale] ?? OG_IMAGE.en}`,
    genre: ['Word Game', 'Puzzle', 'Brain Training', 'Casual'],
    gamePlatform: ['Web Browser', 'iOS', 'Android', 'PWA'],
    playMode: ['SinglePlayer'],
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any (Web Browser)',
    inLanguage: [...SUPPORTED_LANDING_LOCALES],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${BASE_URL}/${locale}/connections`,
    },
    publisher: { '@type': 'Organization', name: 'LexiClash', url: BASE_URL },
  });

  const breadcrumbJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/${locale}` },
      {
        '@type': 'ListItem',
        position: 2,
        name: copy.videoGameName,
        item: `${BASE_URL}/${locale}/connections`,
      },
    ],
  });

  return (
    <>
      {supported && (
        <>
          <Script id="ld-faq-connections" type="application/ld+json">
            {faqJsonLd}
          </Script>
          <Script id="ld-videogame-connections" type="application/ld+json">
            {videoGameJsonLd}
          </Script>
          <Script id="ld-breadcrumb-connections" type="application/ld+json">
            {breadcrumbJsonLd}
          </Script>
        </>
      )}
      <ConnectionsPageClient locale={locale} copy={copy} renderLanding={supported} />
    </>
  );
}
