import { loadTranslation, type TranslationData } from '@/translations/loadTranslation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

interface LayoutParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (locale as Locale) || 'en';
  const t = await loadTranslation(validLocale) as Record<string, any>;
  const enT = await loadTranslation('en') as Record<string, any>;
  const seo = t?.seo?.profile || enT.seo.profile;
  const baseSeo = t?.seo || enT.seo;

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
        es: 'https://www.lexiclash.live/es/profile',
        'en-IL': 'https://www.lexiclash.live/en/profile',
        'he-IL': 'https://www.lexiclash.live/he/profile',
        'en-US': 'https://www.lexiclash.live/en/profile',
        'es-US': 'https://www.lexiclash.live/es/profile',
        'en-GB': 'https://www.lexiclash.live/en/profile',
        'en-SE': 'https://www.lexiclash.live/en/profile',
        'sv-SE': 'https://www.lexiclash.live/sv/profile',
        'en-JP': 'https://www.lexiclash.live/en/profile',
        'ja-JP': 'https://www.lexiclash.live/ja/profile',
        'en-ES': 'https://www.lexiclash.live/en/profile',
        'es-ES': 'https://www.lexiclash.live/es/profile',
        'en-MX': 'https://www.lexiclash.live/en/profile',
        'es-MX': 'https://www.lexiclash.live/es/profile',
        'en-AU': 'https://www.lexiclash.live/en/profile',
        'es-AR': 'https://www.lexiclash.live/es/profile',
        'es-CO': 'https://www.lexiclash.live/es/profile',
      },
    },
    // Private user page — exclude from search indexing.
    // Content is personalized and auth-gated; no SEO value in crawling it.
    robots: {
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
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
  // mainEntity is required by Google for ProfilePage schema
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
    // Generic Person entity - actual user data is loaded client-side
    // This satisfies Google's requirement for mainEntity on ProfilePage
    mainEntity: {
      '@type': 'Person',
      '@id': `https://www.lexiclash.live${localePath}/profile#person`,
      name: 'LexiClash Player',
      description: 'A LexiClash multiplayer word game player profile',
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
