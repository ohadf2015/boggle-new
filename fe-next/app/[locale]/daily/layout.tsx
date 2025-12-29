import { translations } from '@/translations';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

interface LayoutParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (locale as Locale) || 'en';
  const seo = translations[validLocale]?.seo?.daily || translations.en.seo.daily;
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
      url: `https://www.lexiclash.live${localePath}/daily`,
      title: seo.ogTitle,
      description: seo.ogDescription,
      siteName: 'LexiClash',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: 'LexiClash - Daily Word Challenge',
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
      canonical: `https://www.lexiclash.live${localePath}/daily`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/daily',
        he: 'https://www.lexiclash.live/he/daily',
        en: 'https://www.lexiclash.live/en/daily',
        sv: 'https://www.lexiclash.live/sv/daily',
        ja: 'https://www.lexiclash.live/ja/daily',
        es: 'https://www.lexiclash.live/es/daily',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface DailyLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function DailyLayout({ children, params }: DailyLayoutProps): Promise<ReactNode> {
  const { locale } = await params;
  const localePath = `/${locale}`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `https://www.lexiclash.live${localePath}/daily#breadcrumb`,
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
        name: 'Daily Challenge',
        item: `https://www.lexiclash.live${localePath}/daily`,
      },
    ],
  };

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `https://www.lexiclash.live${localePath}/daily#webpage`,
    url: `https://www.lexiclash.live${localePath}/daily`,
    name: 'Daily Challenge - LexiClash',
    description: 'Play the LexiClash Daily Challenge! Same puzzle for everyone worldwide each day. Share your results like Wordle.',
    isPartOf: {
      '@id': 'https://www.lexiclash.live/#website',
    },
    breadcrumb: {
      '@id': `https://www.lexiclash.live${localePath}/daily#breadcrumb`,
    },
    about: {
      '@id': 'https://www.lexiclash.live/#webapp',
    },
  };

  // Event schema for Daily Challenge - recurring daily event (like Wordle)
  // This helps search engines understand the time-sensitive nature of the content
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `https://www.lexiclash.live${localePath}/daily#event`,
    name: 'LexiClash Daily Word Challenge',
    description: 'Daily word puzzle challenge - same board for everyone worldwide. New puzzle every day at midnight UTC. Share your emoji results like Wordle!',
    startDate: today.toISOString().split('T')[0],
    endDate: tomorrow.toISOString().split('T')[0],
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: {
      '@type': 'VirtualLocation',
      url: `https://www.lexiclash.live${localePath}/daily`,
    },
    organizer: {
      '@id': 'https://www.lexiclash.live/#organization',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `https://www.lexiclash.live${localePath}/daily`,
      validFrom: today.toISOString().split('T')[0],
    },
    performer: {
      '@type': 'Organization',
      name: 'LexiClash',
    },
    image: 'https://www.lexiclash.live/og-image-en.jpg',
    isAccessibleForFree: true,
    inLanguage: ['en', 'he', 'sv', 'ja', 'es'],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbSchema, webPageSchema, eventSchema]) }}
      />
      {children}
    </>
  );
}
