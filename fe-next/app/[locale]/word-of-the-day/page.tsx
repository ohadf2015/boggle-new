import type { Metadata } from 'next';
import { wordsByLocale, getTodayWord, type Locale } from './content';
import WordOfTheDayClient from './PageClient';

const SITE_URL = 'https://www.lexiclash.live';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const titleMap: Record<string, string> = {
  en: 'Word of the Day - Expand Your Vocabulary | LexiClash',
  he: 'המילה היומית - הרחיבו את אוצר המילים | LexiClash',
  sv: 'Dagens Ord - Utoka Ditt Ordforrad | LexiClash',
  ja: '今日の言葉 - 語彙を広げよう | LexiClash',
  es: 'Palabra del Dia - Amplia Tu Vocabulario | LexiClash',
};

const descriptionMap: Record<string, string> = {
  en: 'Discover a new word every day with LexiClash Word of the Day. Learn definitions, etymology, usage examples, and fun facts. Then practice in our word game!',
  he: 'גלו מילה חדשה כל יום עם המילה היומית של LexiClash. למדו הגדרות, אטימולוגיה, דוגמאות שימוש ועובדות מעניינות.',
  sv: 'Upptack ett nytt ord varje dag med LexiClash Dagens Ord. Lar dig definitioner, etymologi, anvandningsexempel och roliga fakta.',
  ja: 'LexiClashの今日の言葉で毎日新しい言葉を発見。定義、語源、使用例、豆知識を学びましょう。',
  es: 'Descubre una nueva palabra cada dia con LexiClash Palabra del Dia. Aprende definiciones, etimologia, ejemplos de uso y datos curiosos.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const todayWord = getTodayWord(locale as Locale);
  const title = titleMap[locale] || titleMap.en;
  const description = descriptionMap[locale] || descriptionMap.en;
  const url = `${SITE_URL}/${locale}/word-of-the-day`;

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      siteName: 'LexiClash',
      images: [{ url: `${SITE_URL}/og-image-${locale === 'he' ? 'he' : 'en'}.jpg`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${todayWord.word} - ${title}`,
      description,
    },
    alternates: {
      canonical: url,
      languages: {
        'x-default': `${SITE_URL}/en/word-of-the-day`,
        he: `${SITE_URL}/he/word-of-the-day`,
        en: `${SITE_URL}/en/word-of-the-day`,
        sv: `${SITE_URL}/sv/word-of-the-day`,
        ja: `${SITE_URL}/ja/word-of-the-day`,
        es: `${SITE_URL}/es/word-of-the-day`,
        'en-IL': `${SITE_URL}/en/word-of-the-day`,
        'he-IL': `${SITE_URL}/he/word-of-the-day`,
        'en-US': `${SITE_URL}/en/word-of-the-day`,
        'es-US': `${SITE_URL}/es/word-of-the-day`,
        'en-GB': `${SITE_URL}/en/word-of-the-day`,
        'en-SE': `${SITE_URL}/en/word-of-the-day`,
        'sv-SE': `${SITE_URL}/sv/word-of-the-day`,
        'en-JP': `${SITE_URL}/en/word-of-the-day`,
        'ja-JP': `${SITE_URL}/ja/word-of-the-day`,
        'en-ES': `${SITE_URL}/en/word-of-the-day`,
        'es-ES': `${SITE_URL}/es/word-of-the-day`,
        'en-MX': `${SITE_URL}/en/word-of-the-day`,
        'es-MX': `${SITE_URL}/es/word-of-the-day`,
        'en-AU': `${SITE_URL}/en/word-of-the-day`,
        'es-AR': `${SITE_URL}/es/word-of-the-day`,
        'es-CO': `${SITE_URL}/es/word-of-the-day`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function WordOfTheDayPage({ params }: PageProps) {
  const { locale } = await params;
  const loc = (locale as Locale) || 'en';
  const todayWord = getTodayWord(loc);
  const allWords = wordsByLocale[loc] || wordsByLocale.en;

  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/${locale}` },
        { '@type': 'ListItem', position: 2, name: 'Word of the Day', item: `${SITE_URL}/${locale}/word-of-the-day` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      name: todayWord.word,
      description: todayWord.definition,
      inDefinedTermSet: {
        '@type': 'DefinedTermSet',
        name: 'LexiClash Word of the Day',
        url: `${SITE_URL}/${locale}/word-of-the-day`,
      },
      termCode: todayWord.dateKey,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${SITE_URL}/${locale}/word-of-the-day#webpage`,
      url: `${SITE_URL}/${locale}/word-of-the-day`,
      name: titleMap[locale] || titleMap.en,
      description: descriptionMap[locale] || descriptionMap.en,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['[data-speakable="true"]'],
      },
    },
  ];

  // Safe: schemas built entirely from static constants defined in this file, no user input
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
      />
      <WordOfTheDayClient allWords={allWords} />
    </>
  );
}
