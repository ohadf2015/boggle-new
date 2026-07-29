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
  const seo = t?.seo?.studentProfile || enT.seo.studentProfile;
  const baseSeo = t?.seo || enT.seo;

  // Always use explicit locale path for SEO consistency
  const localePath = `/${locale}`;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'profile',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/student/profile`,
      title: seo.ogTitle,
      description: seo.ogDescription,
      siteName: 'LexiClash',
      images: [
        {
          url: 'https://www.lexiclash.live/lexiclash.jpg',
          width: 1200,
          height: 630,
          alt: 'LexiClash Education - Student Profile',
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
      canonical: `https://www.lexiclash.live${localePath}/student/profile`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/student/profile',
        he: 'https://www.lexiclash.live/he/student/profile',
        en: 'https://www.lexiclash.live/en/student/profile',
        sv: 'https://www.lexiclash.live/sv/student/profile',
        ja: 'https://www.lexiclash.live/ja/student/profile',
        es: 'https://www.lexiclash.live/es/student/profile',
        'en-IL': 'https://www.lexiclash.live/en/student/profile',
        'he-IL': 'https://www.lexiclash.live/he/student/profile',
        'en-US': 'https://www.lexiclash.live/en/student/profile',
        'es-US': 'https://www.lexiclash.live/es/student/profile',
        'en-GB': 'https://www.lexiclash.live/en/student/profile',
        'en-SE': 'https://www.lexiclash.live/en/student/profile',
        'sv-SE': 'https://www.lexiclash.live/sv/student/profile',
        'en-JP': 'https://www.lexiclash.live/en/student/profile',
        'ja-JP': 'https://www.lexiclash.live/ja/student/profile',
        'en-ES': 'https://www.lexiclash.live/en/student/profile',
        'es-ES': 'https://www.lexiclash.live/es/student/profile',
        'en-MX': 'https://www.lexiclash.live/en/student/profile',
        'es-MX': 'https://www.lexiclash.live/es/student/profile',
        'en-AU': 'https://www.lexiclash.live/en/student/profile',
        'es-AR': 'https://www.lexiclash.live/es/student/profile',
        'es-CO': 'https://www.lexiclash.live/es/student/profile',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface StudentProfileLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function StudentProfileLayout({ children, params }: StudentProfileLayoutProps): Promise<ReactNode> {
  const { locale } = await params;
  // Always use explicit locale path for SEO consistency
  const localePath = `/${locale}`;

  // Breadcrumb structured data - shows page hierarchy for search engines
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `https://www.lexiclash.live${localePath}/student/profile#breadcrumb`,
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
        name: 'Student',
        item: `https://www.lexiclash.live${localePath}/student`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Profile',
        item: `https://www.lexiclash.live${localePath}/student/profile`,
      },
    ],
  };

  // ProfilePage schema - identifies this as a profile page subordinate to the main site
  // mainEntity is required by Google for ProfilePage schema
  const profilePageSchema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `https://www.lexiclash.live${localePath}/student/profile#webpage`,
    url: `https://www.lexiclash.live${localePath}/student/profile`,
    name: 'Student Profile - LexiClash Education',
    description: 'View and manage your LexiClash student profile, XP progress, lesson completion, and educational achievements.',
    isPartOf: {
      '@id': 'https://www.lexiclash.live/#website',
    },
    breadcrumb: {
      '@id': `https://www.lexiclash.live${localePath}/student/profile#breadcrumb`,
    },
    // Generic Person entity - actual user data is loaded client-side
    // This satisfies Google's requirement for mainEntity on ProfilePage
    mainEntity: {
      '@type': 'Person',
      '@id': `https://www.lexiclash.live${localePath}/student/profile#person`,
      name: 'LexiClash Student',
      description: 'A LexiClash education student profile with XP progress and achievements',
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
