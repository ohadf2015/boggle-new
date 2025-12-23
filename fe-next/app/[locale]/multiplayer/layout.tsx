import { translations } from '@/translations';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

type Locale = 'en' | 'he' | 'sv' | 'ja';

interface LayoutParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (locale as Locale) || 'en';
  const seo = translations[validLocale]?.seo?.multiplayer || translations.en.seo.multiplayer;
  const baseSeo = translations[validLocale]?.seo || translations.en.seo;

  const localePath = `/${locale}`;
  const ogImage = locale === 'he'
    ? 'https://www.lexiclash.live/og-image-he.jpg'
    : 'https://www.lexiclash.live/og-image-en.jpg';

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
    description: 'Join real-time word battles with friends! Host or join multiplayer rooms and compete live.',
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
