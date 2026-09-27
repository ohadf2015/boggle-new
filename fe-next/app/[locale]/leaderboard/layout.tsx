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
  const seo = t?.seo?.leaderboard || enT.seo.leaderboard;
  const baseSeo = t?.seo || enT.seo;

  // Always use explicit locale path for SEO consistency
  const localePath = `/${locale}`;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/leaderboard`,
      title: seo.ogTitle,
      description: seo.ogDescription,
      siteName: 'LexiClash',
      images: [
        {
          url: 'https://www.lexiclash.live/lexiclash.jpg',
          width: 1200,
          height: 630,
          alt: 'LexiClash - Multiplayer Word Game',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: ['https://www.lexiclash.live/lexiclash.jpg'],
    },
    alternates: {
      canonical: `https://www.lexiclash.live${localePath}/leaderboard`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/leaderboard',
        he: 'https://www.lexiclash.live/he/leaderboard',
        en: 'https://www.lexiclash.live/en/leaderboard',
        sv: 'https://www.lexiclash.live/sv/leaderboard',
        ja: 'https://www.lexiclash.live/ja/leaderboard',
        es: 'https://www.lexiclash.live/es/leaderboard',
        'en-IL': 'https://www.lexiclash.live/en/leaderboard',
        'he-IL': 'https://www.lexiclash.live/he/leaderboard',
        'en-US': 'https://www.lexiclash.live/en/leaderboard',
        'es-US': 'https://www.lexiclash.live/es/leaderboard',
        'en-GB': 'https://www.lexiclash.live/en/leaderboard',
        'en-SE': 'https://www.lexiclash.live/en/leaderboard',
        'sv-SE': 'https://www.lexiclash.live/sv/leaderboard',
        'en-JP': 'https://www.lexiclash.live/en/leaderboard',
        'ja-JP': 'https://www.lexiclash.live/ja/leaderboard',
        'en-ES': 'https://www.lexiclash.live/en/leaderboard',
        'es-ES': 'https://www.lexiclash.live/es/leaderboard',
        'en-MX': 'https://www.lexiclash.live/en/leaderboard',
        'es-MX': 'https://www.lexiclash.live/es/leaderboard',
        'en-AU': 'https://www.lexiclash.live/en/leaderboard',
        'es-AR': 'https://www.lexiclash.live/es/leaderboard',
        'es-CO': 'https://www.lexiclash.live/es/leaderboard',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface LeaderboardLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LeaderboardLayout({ children, params }: LeaderboardLayoutProps): Promise<ReactNode> {
  const { locale } = await params;
  // Always use explicit locale path for SEO consistency
  const localePath = `/${locale}`;

  // Breadcrumb structured data - shows page hierarchy for search engines
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `https://www.lexiclash.live${localePath}/leaderboard#breadcrumb`,
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
        name: 'Leaderboard',
        item: `https://www.lexiclash.live${localePath}/leaderboard`,
      },
    ],
  };

  // WebPage schema - identifies this page as subordinate to the main site
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `https://www.lexiclash.live${localePath}/leaderboard#webpage`,
    url: `https://www.lexiclash.live${localePath}/leaderboard`,
    name: 'Leaderboard - LexiClash',
    description: 'View the top LexiClash players and their scores. See where you rank among word game champions.',
    isPartOf: {
      '@id': 'https://www.lexiclash.live/#website',
    },
    breadcrumb: {
      '@id': `https://www.lexiclash.live${localePath}/leaderboard#breadcrumb`,
    },
    about: {
      '@id': 'https://www.lexiclash.live/#webapp',
    },
  };

  // ItemList schema - indicates this is a ranked list of items (players)
  // This can help with rich snippets showing leaderboard rankings
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `https://www.lexiclash.live${localePath}/leaderboard#itemlist`,
    name: 'LexiClash Global Leaderboard',
    description: 'Top-ranked players in LexiClash multiplayer word game. Rankings based on total score, wins, and achievements.',
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: 100,
    itemListElement: [
      // Placeholder items to indicate structure - actual data is dynamic
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Top Player',
        description: 'Highest ranked player in LexiClash',
      },
    ],
  };

  // CollectionPage schema - indicates this is a collection/gallery of items
  const collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `https://www.lexiclash.live${localePath}/leaderboard#collectionpage`,
    name: 'LexiClash Global Leaderboard',
    description: 'View the top-ranked word game players worldwide. Track your progress and compete for the top spot.',
    url: `https://www.lexiclash.live${localePath}/leaderboard`,
    mainEntity: {
      '@id': `https://www.lexiclash.live${localePath}/leaderboard#itemlist`,
    },
    isPartOf: {
      '@id': 'https://www.lexiclash.live/#website',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbSchema, webPageSchema, itemListSchema, collectionPageSchema]) }}
      />
      {children}
    </>
  );
}
