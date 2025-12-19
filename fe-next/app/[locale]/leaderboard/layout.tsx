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
  const seo = translations[validLocale]?.seo?.leaderboard || translations.en.seo.leaderboard;
  const baseSeo = translations[validLocale]?.seo || translations.en.seo;

  const localePath = locale === 'he' ? '' : `/${locale}`;

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
        'x-default': 'https://www.lexiclash.live/leaderboard',
        he: 'https://www.lexiclash.live/he/leaderboard',
        en: 'https://www.lexiclash.live/en/leaderboard',
        sv: 'https://www.lexiclash.live/sv/leaderboard',
        ja: 'https://www.lexiclash.live/ja/leaderboard',
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
  const localePath = locale === 'he' ? '' : `/${locale}`;

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
