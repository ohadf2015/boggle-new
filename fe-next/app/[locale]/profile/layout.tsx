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
  const seo = translations[validLocale]?.seo?.profile || translations.en.seo.profile;
  const baseSeo = translations[validLocale]?.seo || translations.en.seo;

  // Always use explicit locale path for SEO consistency
  const localePath = `/${locale}`;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'profile',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/profile`,
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
      canonical: `https://www.lexiclash.live${localePath}/profile`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/profile',
        he: 'https://www.lexiclash.live/he/profile',
        en: 'https://www.lexiclash.live/en/profile',
        sv: 'https://www.lexiclash.live/sv/profile',
        ja: 'https://www.lexiclash.live/ja/profile',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface ProfileLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function ProfileLayout({ children, params }: ProfileLayoutProps): Promise<ReactNode> {
  const { locale } = await params;
  // Always use explicit locale path for SEO consistency
  const localePath = `/${locale}`;

  // Breadcrumb structured data - shows page hierarchy for search engines
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `https://www.lexiclash.live${localePath}/profile#breadcrumb`,
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
        name: 'Profile',
        item: `https://www.lexiclash.live${localePath}/profile`,
      },
    ],
  };

  // ProfilePage schema - identifies this as a profile page subordinate to the main site
  const profilePageSchema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `https://www.lexiclash.live${localePath}/profile#webpage`,
    url: `https://www.lexiclash.live${localePath}/profile`,
    name: 'Player Profile - LexiClash',
    description: 'View and manage your LexiClash player profile, stats, achievements, and game history.',
    isPartOf: {
      '@id': 'https://www.lexiclash.live/#website',
    },
    breadcrumb: {
      '@id': `https://www.lexiclash.live${localePath}/profile#breadcrumb`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbSchema, profilePageSchema]) }}
      />
      {children}
    </>
  );
}
