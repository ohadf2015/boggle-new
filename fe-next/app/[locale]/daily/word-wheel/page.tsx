import React, { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import type { Metadata } from 'next';
import { DailyLoadingFallback } from '@/components/daily/DailyLoadingFallback';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';
const LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
const BASE_URL = 'https://www.lexiclash.live';

interface PageParams {
  params: Promise<{ locale: string }>;
}

const LoadingFallback = () => <DailyLoadingFallback mode="wordWheel" />;

const WordWheelChallenge = dynamicImport(
  () => import('@/components/daily/WordWheelChallenge'),
  { loading: LoadingFallback }
);

export const revalidate = 3600;

const wordWheelMeta: Record<string, { title: string; description: string; ogTitle: string; ogDesc: string }> = {
  en: {
    title: 'Daily Word Wheel - Free Word Puzzle | LexiClash',
    description: 'Play the Daily Word Wheel — find words from a wheel of letters. New puzzle every day at midnight UTC. Same board worldwide. Track your streak and compete for the world record!',
    ogTitle: "Daily Word Wheel — Today's Free Puzzle | LexiClash",
    ogDesc: 'New word wheel puzzle every day. Find all the words, chase the world record. Free, no download!',
  },
  he: {
    title: 'גלגל מילים יומי - פאזל מילים חינם | LexiClash',
    description: 'שחקו בגלגל המילים היומי — מצאו מילים מגלגל אותיות. פאזל חדש כל יום. אותו לוח לכל העולם. עקבו אחר הרצף שלכם!',
    ogTitle: 'גלגל מילים יומי — פאזל היום | LexiClash',
    ogDesc: 'גלגל מילים חדש כל יום. מצאו מילים, שברו שיאים!',
  },
  sv: {
    title: 'Dagligt Ordhjul - Gratis Ordpussel | LexiClash',
    description: 'Spela dagliga Ordhjulet — hitta ord fran ett hjul av bokstaver. Nytt pussel varje dag. Samma braede varldsomspannande.',
    ogTitle: 'Dagligt Ordhjul — Dagens Pussel | LexiClash',
    ogDesc: 'Nytt ordhjul varje dag. Hitta ord, jaga varldsrekordet!',
  },
  ja: {
    title: 'デイリーワードホイール - 無料ワードパズル | LexiClash',
    description: 'デイリーワードホイールをプレイ — 文字ホイールから単語を見つけよう。毎日新しいパズル。世界共通ボード。ストリークを追跡して世界記録に挑戦！',
    ogTitle: 'デイリーワードホイール — 今日のパズル | LexiClash',
    ogDesc: '毎日新しいワードホイール。単語を見つけて世界記録に挑戦！',
  },
  es: {
    title: 'Rueda de Palabras Diaria - Puzzle Gratis | LexiClash',
    description: 'Juega la Rueda de Palabras Diaria — encuentra palabras en una rueda de letras. Nuevo puzzle cada dia. Mismo tablero mundial. Compite por el record mundial!',
    ogTitle: 'Rueda de Palabras Diaria — Puzzle de Hoy | LexiClash',
    ogDesc: 'Nueva rueda de palabras cada dia. Encuentra palabras, persigue el record mundial!',
  },
};

const wordWheelSeoContent: Record<string, { title: string; description: string; features: string[]; faq: { question: string; answer: string }[] }> = {
  en: {
    title: 'Daily Word Wheel Challenge',
    description: 'A new word wheel puzzle every day. Find words using letters from a wheel — every word must include the center letter. Compete globally and track your streak.',
    features: [
      'New word wheel puzzle every day at midnight UTC',
      'Same letters for all players worldwide — fair competition',
      'Every word must include the center letter',
      'Longer words earn more points',
      'Global leaderboard and daily world record',
      'Track your daily streak',
      'Share results with friends',
    ],
    faq: [
      { question: 'What is the Daily Word Wheel?', answer: 'The Daily Word Wheel is a free daily word puzzle where you find words using letters arranged in a wheel. Every word must include the center letter. A new puzzle appears every day at midnight UTC.' },
      { question: 'How do I play the Word Wheel?', answer: 'Form words using the letters in the wheel. Every word must include the center letter. Longer words score more points. Find as many words as possible before time runs out.' },
      { question: 'When does the Word Wheel reset?', answer: 'A new Word Wheel puzzle is generated every day at midnight UTC. Your progress resets and a fresh leaderboard begins.' },
    ],
  },
  he: {
    title: 'אתגר גלגל המילים היומי',
    description: 'גלגל מילים חדש כל יום. מצאו מילים מאותיות בגלגל — כל מילה חייבת לכלול את האות המרכזית.',
    features: ['גלגל חדש כל יום בחצות', 'אותן אותיות לכל השחקנים', 'כל מילה חייבת לכלול את האות המרכזית', 'מילים ארוכות = יותר נקודות'],
    faq: [{ question: 'מהו גלגל המילים היומי?', answer: 'גלגל המילים היומי הוא פאזל מילים חינמי שבו מוצאים מילים מאותיות בגלגל. פאזל חדש כל יום בחצות.' }],
  },
  ja: {
    title: 'デイリーワードホイールチャレンジ',
    description: '毎日新しいワードホイールパズル。ホイールの文字から単語を見つけよう。すべての単語に中央の文字を含める必要があります。',
    features: ['毎日UTC午前0時に新パズル', '世界中同じ文字', 'すべての単語に中央文字が必要', '長い単語 = 高得点'],
    faq: [{ question: 'デイリーワードホイールとは？', answer: 'ホイールに配置された文字から単語を見つける無料の日替わりパズルです。毎日午前0時に新しいパズルが出題されます。' }],
  },
  sv: {
    title: 'Dagliga Ordhjulet',
    description: 'Nytt ordhjul varje dag. Hitta ord fran bokstaver i ett hjul.',
    features: ['Nytt pussel varje dag', 'Samma bokstaver foer alla', 'Alla ord maaste innehaalla mittenbokstaven'],
    faq: [],
  },
  es: {
    title: 'Desafio Diario Rueda de Palabras',
    description: 'Nueva rueda de palabras cada dia. Encuentra palabras usando las letras de la rueda.',
    features: ['Nuevo puzzle cada dia', 'Mismas letras para todos', 'Todas las palabras deben incluir la letra central'],
    faq: [],
  },
};

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (locale as Locale) || 'en';
  const meta = wordWheelMeta[validLocale] || wordWheelMeta.en;
  const localePath = `/${validLocale}`;

  const languages: Record<string, string> = {
    'x-default': `${BASE_URL}/en/daily/word-wheel`,
  };
  LOCALES.forEach((l) => { languages[l] = `${BASE_URL}/${l}/daily/word-wheel`; });
  languages['en-IL'] = `${BASE_URL}/en/daily/word-wheel`;
  languages['he-IL'] = `${BASE_URL}/he/daily/word-wheel`;
  languages['en-US'] = `${BASE_URL}/en/daily/word-wheel`;
  languages['es-US'] = `${BASE_URL}/es/daily/word-wheel`;
  languages['en-GB'] = `${BASE_URL}/en/daily/word-wheel`;
  languages['sv-SE'] = `${BASE_URL}/sv/daily/word-wheel`;
  languages['ja-JP'] = `${BASE_URL}/ja/daily/word-wheel`;
  languages['es-ES'] = `${BASE_URL}/es/daily/word-wheel`;
  languages['es-MX'] = `${BASE_URL}/es/daily/word-wheel`;

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      type: 'website',
      locale: validLocale === 'he' ? 'he_IL' : validLocale === 'ja' ? 'ja_JP' : validLocale === 'sv' ? 'sv_SE' : validLocale === 'es' ? 'es_ES' : 'en_US',
      url: `${BASE_URL}${localePath}/daily/word-wheel`,
      title: meta.ogTitle,
      description: meta.ogDesc,
      siteName: 'LexiClash',
      images: [{ url: `${BASE_URL}/${validLocale}/daily-word-wheel/opengraph-image`, width: 1200, height: 630, alt: meta.ogTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.ogTitle,
      description: meta.ogDesc,
      images: [`${BASE_URL}/${validLocale}/daily-word-wheel/opengraph-image`],
    },
    alternates: {
      canonical: `${BASE_URL}${localePath}/daily/word-wheel`,
      languages,
    },
    // Game shell — noindexed 2026-07-02 (AdSense low-value-content remediation);
    // /daily-word-wheel is the indexable landing for this mode.
    robots: { index: false, follow: true },
  };
}

export default async function WordWheelPage({ params }: PageParams): Promise<React.JSX.Element> {
  const { locale } = await params;
  const validLocale = (locale as Locale) || 'en';
  const localePath = `/${validLocale}`;
  const content = wordWheelSeoContent[validLocale] || wordWheelSeoContent.en;

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Static structured data — all content from hardcoded constants, safe for dangerouslySetInnerHTML
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'LexiClash', item: `${BASE_URL}${localePath}` },
        { '@type': 'ListItem', position: 2, name: 'Daily Challenge', item: `${BASE_URL}${localePath}/daily` },
        { '@type': 'ListItem', position: 3, name: 'Word Wheel', item: `${BASE_URL}${localePath}/daily/word-wheel` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: 'Daily Word Wheel - LexiClash',
      description: 'Daily word wheel puzzle — find words from a wheel of letters. New puzzle every day at midnight UTC. Same board worldwide.',
      startDate: today.toISOString().split('T')[0],
      endDate: tomorrow.toISOString().split('T')[0],
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      location: { '@type': 'VirtualLocation', url: `${BASE_URL}${localePath}/daily/word-wheel` },
      organizer: { '@type': 'Organization', name: 'LexiClash' },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: `${BASE_URL}${localePath}/daily/word-wheel` },
      isAccessibleForFree: true,
      inLanguage: ['en', 'he', 'sv', 'ja', 'es'],
    },
    ...(content.faq.length > 0 ? [{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: content.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    }] : []),
  ];

  return (
    <>
      {/* Static JSON-LD — all content from hardcoded constants, no user input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }} />
      <Suspense fallback={<LoadingFallback />}>
        <WordWheelChallenge />
      </Suspense>
      <GamePageSeoContent
        title={content.title}
        description={content.description}
        features={content.features}
        faq={content.faq}
      />
    </>
  );
}
