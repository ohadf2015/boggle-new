import { loadTranslation, type TranslationData } from '@/translations/loadTranslation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

const seoContent: Record<string, { title: string; description: string; features: string[]; faq: { question: string; answer: string }[] }> = {
  en: {
    title: 'Daily Word Challenge - Same Puzzle Worldwide',
    description: 'A new word puzzle every day at midnight UTC. Everyone plays the same board. Share your results and compete on the global daily leaderboard.',
    features: [
      'New puzzle every day at midnight UTC',
      'Same board for all players worldwide - fair competition',
      'Share emoji results with friends, just like Wordle',
      'Word Hunt Survival: find the hidden word in 10 attempts',
      'Daily streaks reward consistent play',
      'Global leaderboard resets each day',
    ],
    faq: [
      { question: 'When does the daily puzzle reset?', answer: 'A new puzzle is generated every day at midnight UTC. Your progress resets and a fresh leaderboard begins.' },
      { question: 'Can I share my results?', answer: 'Yes! After completing the puzzle, tap the share button to copy an emoji grid summary. Share it on social media or messaging apps without spoiling the answer.' },
      { question: 'What is Word Hunt Survival?', answer: 'Word Hunt is a daily word search challenge where you have 10 attempts to find the hidden target word on the board. Think of it as Wordle meets Boggle.' },
    ],
  },
  he: {
    title: 'אתגר מילים יומי - אותו פאזל לכל העולם',
    description: 'פאזל מילים חדש כל יום בחצות UTC. כולם משחקים על אותו לוח. שתפו תוצאות והתחרו בטבלת המובילים היומית.',
    features: [
      'פאזל חדש כל יום בחצות',
      'אותו לוח לכל השחקנים בעולם',
      'שתפו תוצאות אמוג\'י עם חברים',
      'מצא מילה: מצאו את המילה הנסתרת ב-10 ניסיונות',
      'רצפים יומיים מתגמלים משחק עקבי',
    ],
    faq: [
      { question: 'מתי מתאפס האתגר היומי?', answer: 'פאזל חדש נוצר כל יום בחצות UTC. ההתקדמות מתאפסת וטבלת מובילים חדשה מתחילה.' },
    ],
  },
  ja: {
    title: 'デイリーワードチャレンジ - 世界共通パズル',
    description: '毎日UTC午前0時に新しいワードパズル。全プレイヤーが同じボードでプレイ。結果を共有してグローバルランキングで競いましょう。',
    features: [
      '毎日UTC午前0時に新パズル',
      '世界中の全プレイヤーが同じボード',
      '絵文字で結果を友達にシェア',
    ],
    faq: [],
  },
  sv: {
    title: 'Daglig Ordutmaning - Samma Pussel Varldsomspannande',
    description: 'Ett nytt ordpussel varje dag. Alla spelar paa samma braede.',
    features: ['Nytt pussel varje dag', 'Samma braede foer alla spelare', 'Dela emoji-resultat'],
    faq: [],
  },
  es: {
    title: 'Desafio Diario de Palabras - Mismo Puzzle Mundial',
    description: 'Un nuevo puzzle de palabras cada dia. Todos juegan el mismo tablero. Comparte resultados y compite en el ranking global.',
    features: ['Nuevo puzzle cada dia', 'Mismo tablero para todos', 'Comparte resultados emoji'],
    faq: [],
  },
};

interface LayoutParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (locale as Locale) || 'en';
  const t = await loadTranslation(validLocale) as Record<string, any>;
  const enT = await loadTranslation('en') as Record<string, any>;
  const seo = t?.seo?.daily || enT.seo.daily;
  const baseSeo = t?.seo || enT.seo;

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
        'en-IL': 'https://www.lexiclash.live/en/daily',
        'he-IL': 'https://www.lexiclash.live/he/daily',
        'en-US': 'https://www.lexiclash.live/en/daily',
        'es-US': 'https://www.lexiclash.live/es/daily',
        'en-GB': 'https://www.lexiclash.live/en/daily',
        'en-SE': 'https://www.lexiclash.live/en/daily',
        'sv-SE': 'https://www.lexiclash.live/sv/daily',
        'en-JP': 'https://www.lexiclash.live/en/daily',
        'ja-JP': 'https://www.lexiclash.live/ja/daily',
        'en-ES': 'https://www.lexiclash.live/en/daily',
        'es-ES': 'https://www.lexiclash.live/es/daily',
        'en-MX': 'https://www.lexiclash.live/en/daily',
        'es-MX': 'https://www.lexiclash.live/es/daily',
        'en-AU': 'https://www.lexiclash.live/en/daily',
        'es-AR': 'https://www.lexiclash.live/es/daily',
        'es-CO': 'https://www.lexiclash.live/es/daily',
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
    description: 'Play the daily Word Hunt Survival word search puzzle. Same puzzle for everyone worldwide. Share results like Wordle!',
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

  // ItemList schema for the daily challenge modes
  const challengeListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `https://www.lexiclash.live${localePath}/daily#challenges`,
    name: 'Daily Word Challenges',
    description: 'Daily word challenge updated every day',
    numberOfItems: 1,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Word Hunt Survival',
        description: 'Classic word search puzzle with 10 attempts to find the target word. Same board worldwide each day. Share emoji results like Wordle!',
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
          ]),
        }}
      />
      {children}
      <GamePageSeoContent
        title={seoContent[locale as keyof typeof seoContent]?.title || seoContent.en.title}
        description={seoContent[locale as keyof typeof seoContent]?.description || seoContent.en.description}
        features={seoContent[locale as keyof typeof seoContent]?.features || seoContent.en.features}
        faq={seoContent[locale as keyof typeof seoContent]?.faq || seoContent.en.faq}
      />
    </>
  );
}
