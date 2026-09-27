import { loadTranslation } from '@/translations/loadTranslation';
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
  // Only load English fallback if current locale is missing SEO data
  const seo = t?.seo?.multiplayer ?? (await loadTranslation('en') as Record<string, any>).seo.multiplayer;
  const baseSeo = t?.seo ?? (await loadTranslation('en') as Record<string, any>).seo;

  const localePath = `/${locale}`;
  const ogImageMap: Record<string, string> = {
    he: 'https://www.lexiclash.live/og-image-he.webp',
    en: 'https://www.lexiclash.live/og-image-en.webp',
    sv: 'https://www.lexiclash.live/og-image-sv.webp',
    ja: 'https://www.lexiclash.live/og-image-ja.webp',
    es: 'https://www.lexiclash.live/og-image-es.webp',
    // ru has no dedicated OG image yet → falls back to en below.
  };
  const ogImage = ogImageMap[locale] || ogImageMap.en;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/multiplayer`,
      title: seo.ogTitle,
      description: seo.ogDescription,
      siteName: 'LexiClash',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: 'LexiClash - Multiplayer Word Battle',
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
      canonical: `https://www.lexiclash.live${localePath}/multiplayer`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/multiplayer',
        he: 'https://www.lexiclash.live/he/multiplayer',
        en: 'https://www.lexiclash.live/en/multiplayer',
        sv: 'https://www.lexiclash.live/sv/multiplayer',
        ja: 'https://www.lexiclash.live/ja/multiplayer',
        es: 'https://www.lexiclash.live/es/multiplayer',
        ru: 'https://www.lexiclash.live/ru/multiplayer',
        'en-IL': 'https://www.lexiclash.live/en/multiplayer',
        'he-IL': 'https://www.lexiclash.live/he/multiplayer',
        'en-US': 'https://www.lexiclash.live/en/multiplayer',
        'es-US': 'https://www.lexiclash.live/es/multiplayer',
        'en-GB': 'https://www.lexiclash.live/en/multiplayer',
        'en-SE': 'https://www.lexiclash.live/en/multiplayer',
        'sv-SE': 'https://www.lexiclash.live/sv/multiplayer',
        'en-JP': 'https://www.lexiclash.live/en/multiplayer',
        'ja-JP': 'https://www.lexiclash.live/ja/multiplayer',
        'en-ES': 'https://www.lexiclash.live/en/multiplayer',
        'es-ES': 'https://www.lexiclash.live/es/multiplayer',
        'en-MX': 'https://www.lexiclash.live/en/multiplayer',
        'es-MX': 'https://www.lexiclash.live/es/multiplayer',
        'en-AU': 'https://www.lexiclash.live/en/multiplayer',
        'es-AR': 'https://www.lexiclash.live/es/multiplayer',
        'es-CO': 'https://www.lexiclash.live/es/multiplayer',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface MultiplayerLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function MultiplayerLayout({ children, params }: MultiplayerLayoutProps): Promise<ReactNode> {
  const { locale } = await params;
  const localePath = `/${locale}`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `https://www.lexiclash.live${localePath}/multiplayer#breadcrumb`,
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
        name: 'Multiplayer',
        item: `https://www.lexiclash.live${localePath}/multiplayer`,
      },
    ],
  };

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `https://www.lexiclash.live${localePath}/multiplayer#webpage`,
    url: `https://www.lexiclash.live${localePath}/multiplayer`,
    name: 'Multiplayer - LexiClash',
    description: 'Free online multiplayer word game — join real-time word battles with friends! Host or join rooms and compete live.',
    isPartOf: {
      '@id': 'https://www.lexiclash.live/#website',
    },
    breadcrumb: {
      '@id': `https://www.lexiclash.live${localePath}/multiplayer#breadcrumb`,
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
