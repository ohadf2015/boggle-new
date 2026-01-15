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

  // NOTE: OG images are handled dynamically in page.tsx based on share params (wh, share)
  // Do NOT add images here or they will override the dynamic images
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
      // images are set dynamically in page.tsx
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.ogTitle,
      description: seo.ogDescription,
      // images are set dynamically in page.tsx
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
    description: 'Play two daily challenges: Word Hunt Survival (word search puzzle) and Daily Buzz (trending topic word game). Same puzzles for everyone worldwide. Share results like Wordle!',
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

  // ItemList schema for the two daily challenge modes
  const challengeListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `https://www.lexiclash.live${localePath}/daily#challenges`,
    name: 'Daily Word Challenges',
    description: 'Two unique daily word challenges updated every day',
    numberOfItems: 2,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Word Hunt Survival',
        description: 'Classic word search puzzle with 10 attempts to find the target word. Same board worldwide each day. Share emoji results like Wordle!',
        url: `https://www.lexiclash.live${localePath}/daily`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Daily Buzz',
        description: 'Trending topic word challenge using AI-generated puzzles based on current events and popular topics. Find words related to today\'s buzz!',
        url: `https://www.lexiclash.live${localePath}/daily`,
      },
    ],
  };

  // Event schema for Daily Challenge - recurring daily event (like Wordle)
  // This helps search engines understand the time-sensitive nature of the content
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Event schema for Word Hunt Survival - daily recurring event
  const wordHuntEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `https://www.lexiclash.live${localePath}/daily#wordhunt-event`,
    name: 'Word Hunt Survival - Daily Challenge',
    description: 'Daily word search puzzle with 10 attempts to find the hidden word. Same board for everyone worldwide. New puzzle every day at midnight UTC. Share emoji results like Wordle!',
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

  // Event schema for Daily Buzz - AI-powered trending topic challenge
  const buzzEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `https://www.lexiclash.live${localePath}/daily#buzz-event`,
    name: 'Daily Buzz - Trending Topic Word Challenge',
    description: 'AI-generated word puzzle based on trending topics and current events. Find words related to today\'s buzz! New topic every day. Play past challenges anytime.',
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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbSchema,
            webPageSchema,
            challengeListSchema,
            wordHuntEventSchema,
            buzzEventSchema,
          ]),
        }}
      />
      {children}
    </>
  );
}
