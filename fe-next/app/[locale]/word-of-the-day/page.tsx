import type { Metadata } from 'next';
import { wordsByLocale, getTodayWord, type Locale } from './content';
import WordOfTheDayClient from './PageClient';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';

export const dynamic = 'force-dynamic';

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
      images: [{ url: `${SITE_URL}/og-image-${locale === 'he' ? 'he' : 'en'}.webp`, width: 1200, height: 630, alt: title }],
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
      {(() => {
        const wotdSeoContent: Record<string, {
          title: string; description: string; features: string[];
          faq: { question: string; answer: string }[];
        }> = {
          en: {
            title: 'Word of the Day — Learn a New Word Every Day',
            description: 'Discover a new word every day on LexiClash. Each Word of the Day includes a definition, etymology, usage examples, and fun facts. Expand your vocabulary and then practice the word in our word game.',
            features: [
              'New curated word every day with definition, etymology, and usage examples',
              'Fun facts and word origins to deepen understanding',
              'Practice mode — use the word in a LexiClash game round',
              'Browse past words to review and build long-term vocabulary',
              'Available in English, Hebrew, Swedish, Japanese, and Spanish',
            ],
            faq: [
              { question: 'When does the Word of the Day update?', answer: 'A new word is selected every day at midnight UTC. The word is the same for all players worldwide, so you can discuss it with friends.' },
              { question: 'Can I see previous Words of the Day?', answer: 'Yes — scroll down on the Word of the Day page to browse the archive of past words with their full definitions and fun facts.' },
              { question: 'How are the words chosen?', answer: 'Words are curated from our dictionary to balance common vocabulary with interesting, lesser-known terms. Each word is selected to be educational and fun.' },
            ],
          },
          he: {
            title: 'המילה היומית — למדו מילה חדשה כל יום',
            description: 'גלו מילה חדשה כל יום ב-LexiClash. כל מילה יומית כוללת הגדרה, אטימולוגיה ודוגמאות שימוש.',
            features: ['מילה חדשה כל יום עם הגדרה ואטימולוגיה', 'עובדות מעניינות ומקורות מילים', 'עברו על מילים קודמות לבניית אוצר מילים'],
            faq: [{ question: 'מתי המילה היומית מתעדכנת?', answer: 'מילה חדשה נבחרת כל יום בחצות UTC. המילה זהה לכל השחקנים בעולם.' }],
          },
          sv: {
            title: 'Dagens Ord — Lär Dig Ett Nytt Ord Varje Dag',
            description: 'Upptäck ett nytt ord varje dag på LexiClash. Varje Dagens Ord inkluderar definition, etymologi och användningsexempel.',
            features: ['Nytt kurerat ord varje dag med definition och etymologi', 'Roliga fakta och ordursprung', 'Bläddra bland tidigare ord för att bygga ordförråd'],
            faq: [{ question: 'När uppdateras Dagens Ord?', answer: 'Ett nytt ord väljs varje dag vid midnatt UTC. Ordet är samma för alla spelare världen över.' }],
          },
          ja: {
            title: '今日の言葉 — 毎日新しい言葉を学ぼう',
            description: 'LexiClashで毎日新しい言葉を発見。定義、語源、使用例、豆知識を含みます。',
            features: ['毎日厳選された新しい言葉と定義・語源', '豆知識と言葉の起源', '過去の言葉を閲覧して語彙を構築'],
            faq: [{ question: '今日の言葉はいつ更新されますか？', answer: '毎日UTC午前0時に新しい言葉が選ばれます。世界中のすべてのプレイヤーに同じ言葉が表示されます。' }],
          },
          es: {
            title: 'Palabra del Día — Aprende Una Palabra Nueva Cada Día',
            description: 'Descubre una nueva palabra cada día en LexiClash. Cada Palabra del Día incluye definición, etimología y ejemplos de uso.',
            features: ['Nueva palabra curada cada día con definición y etimología', 'Datos curiosos y orígenes de palabras', 'Modo práctica — usa la palabra en una ronda de juego', 'Explora palabras anteriores para construir vocabulario'],
            faq: [
              { question: '¿Cuándo se actualiza la Palabra del Día?', answer: 'Una nueva palabra se selecciona cada día a medianoche UTC. La palabra es la misma para todos los jugadores en el mundo.' },
              { question: '¿Puedo ver Palabras del Día anteriores?', answer: 'Sí — desplázate hacia abajo en la página para explorar el archivo de palabras anteriores con sus definiciones completas.' },
            ],
          },
        };
        const seoData = wotdSeoContent[locale] ?? wotdSeoContent.en;
        return (
          <GamePageSeoContent
            asH1
            title={seoData.title}
            description={seoData.description}
            features={seoData.features}
            faq={seoData.faq}
          />
        );
      })()}
    </>
  );
}
