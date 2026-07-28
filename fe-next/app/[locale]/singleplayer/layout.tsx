import { loadTranslation, type TranslationData } from '@/translations/loadTranslation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

interface LayoutParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (locale as Locale) || 'en';
  const t = await loadTranslation(validLocale) as Record<string, any>;
  const enT = await loadTranslation('en') as Record<string, any>;
  const seo = t?.seo?.singleplayer || enT.seo.singleplayer;
  const baseSeo = t?.seo || enT.seo;

  const localePath = `/${locale}`;
  const ogImage = locale === 'he'
    ? 'https://www.lexiclash.live/og-image-he.webp'
    : 'https://www.lexiclash.live/og-image-en.webp';

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/singleplayer`,
      title: seo.ogTitle,
      description: seo.ogDescription,
      siteName: 'LexiClash',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: 'LexiClash - Single Player Word Game',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: [ogImage],
    },
    alternates: {
      canonical: `https://www.lexiclash.live${localePath}/singleplayer`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/singleplayer',
        he: 'https://www.lexiclash.live/he/singleplayer',
        en: 'https://www.lexiclash.live/en/singleplayer',
        sv: 'https://www.lexiclash.live/sv/singleplayer',
        ja: 'https://www.lexiclash.live/ja/singleplayer',
        es: 'https://www.lexiclash.live/es/singleplayer',
        'en-IL': 'https://www.lexiclash.live/en/singleplayer',
        'he-IL': 'https://www.lexiclash.live/he/singleplayer',
        'en-US': 'https://www.lexiclash.live/en/singleplayer',
        'es-US': 'https://www.lexiclash.live/es/singleplayer',
        'en-GB': 'https://www.lexiclash.live/en/singleplayer',
        'en-SE': 'https://www.lexiclash.live/en/singleplayer',
        'sv-SE': 'https://www.lexiclash.live/sv/singleplayer',
        'en-JP': 'https://www.lexiclash.live/en/singleplayer',
        'ja-JP': 'https://www.lexiclash.live/ja/singleplayer',
        'en-ES': 'https://www.lexiclash.live/en/singleplayer',
        'es-ES': 'https://www.lexiclash.live/es/singleplayer',
        'en-MX': 'https://www.lexiclash.live/en/singleplayer',
        'es-MX': 'https://www.lexiclash.live/es/singleplayer',
        'en-AU': 'https://www.lexiclash.live/en/singleplayer',
        'es-AR': 'https://www.lexiclash.live/es/singleplayer',
        'es-CO': 'https://www.lexiclash.live/es/singleplayer',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface SinglePlayerLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function SinglePlayerLayout({ children, params }: SinglePlayerLayoutProps): Promise<ReactNode> {
  const { locale } = await params;
  const localePath = `/${locale}`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `https://www.lexiclash.live${localePath}/singleplayer#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'LexiClash',
        item: `https://www.lexiclash.live${localePath}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Single Player',
        item: `https://www.lexiclash.live${localePath}/singleplayer`,
      },
    ],
  };

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `https://www.lexiclash.live${localePath}/singleplayer#webpage`,
    url: `https://www.lexiclash.live${localePath}/singleplayer`,
    name: 'Single Player - LexiClash',
    description: 'Play LexiClash solo! Practice word finding, challenge AI bots, and improve your vocabulary.',
    isPartOf: {
      '@id': 'https://www.lexiclash.live/#website',
    },
    breadcrumb: {
      '@id': `https://www.lexiclash.live${localePath}/singleplayer#breadcrumb`,
    },
    about: {
      '@id': 'https://www.lexiclash.live/#webapp',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbSchema, webPageSchema]) }}
      />
      {children}
    </>
  );
}
