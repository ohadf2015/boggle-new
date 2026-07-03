import type { Metadata } from 'next';
import { loadTranslation } from '@/translations/loadTranslation';
import type { Language } from '@/types';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { AnimatedLanding } from './AnimatedLanding';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';
const LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

// SEO keywords per locale
const KEYWORDS: Record<Locale, string> = {
  en: 'daily word wheel, word wheel puzzles free online, word wheel puzzle, word wheel game free online, free daily word game, word wheel online, daily word challenge, wordle alternative daily, daily word game free, word wheel puzzle game online, free word wheel puzzle',
  he: 'גלגל מילים יומי, פאזל מילים, משחק מילים חינם, משחק מילים יומי, אתגר מילים',
  sv: 'ordhjulet, dagligt ordhjul, ordpussel, gratis ordspel, dagligt ordspel, ordhjul online',
  ja: 'デイリーワードホイール, ワードパズル, 無料ワードゲーム, 毎日のワードゲーム',
  es: 'rueda de palabras diaria, puzzle de palabras, juego de palabras gratis, juego de palabras diario',
  ru: 'ежедневное колесо слов, словесная головоломка, бесплатная игра в слова, ежедневная игра в слова',
};

// Per-locale metadata fallbacks — kills cross-locale dup-title flagging when translation keys missing
const META_FALLBACK: Record<Locale, { title: string; description: string; ogTitle: string; ogDescription: string }> = {
  en: {
    title: 'Daily Word Wheel Puzzle — Free Online Daily Challenge | LexiClash',
    description: 'Play the free Daily Word Wheel puzzle — spin the letter wheel, find every hidden word. New challenge every day, streak tracking, global leaderboard. No signup, no download.',
    ogTitle: 'Daily Word Wheel Puzzle — Free Daily Challenge',
    ogDescription: 'Spin the word wheel, find all hidden words. New free puzzle every day — streak tracking, global leaderboard!',
  },
  he: {
    title: 'גלגל מילים יומי — פאזל מילים חינם אונליין | LexiClash',
    description: 'סובבו את גלגל המילים היומי ומצאו כל מילה חבויה. פאזל מילים חינם — בלי הרשמה, בלי הורדה. אותיות חדשות בכל יום.',
    ogTitle: 'גלגל מילים יומי — פאזל חינם',
    ogDescription: 'סובבו את הגלגל ומצאו את כל המילים. פאזל חדש כל יום!',
  },
  sv: {
    title: 'Ordhjulet — Dagligt Gratis Pussel Online | LexiClash',
    description: 'Snurra det dagliga ordhjulet och hitta alla dolda ord. Gratis ordpussel online — ingen registrering, ingen nedladdning. Nya bokstäver varje dag.',
    ogTitle: 'Dagligt Ordhjul — Gratis Pussel',
    ogDescription: 'Snurra ordhjulet och hitta alla ord. Nytt pussel varje dag!',
  },
  ja: {
    title: 'デイリーワードホイール — 無料パズルゲーム | LexiClash',
    description: '毎日のワードホイールを回して隠れた単語を全部見つけよう。無料、登録不要、ダウンロード不要。毎日新しい文字。',
    ogTitle: 'デイリーワードホイール — 無料パズル',
    ogDescription: 'ホイールを回して全ての単語を見つけよう。毎日新しいパズル！',
  },
  es: {
    title: 'Rueda de Palabras Diaria — Puzzle Gratis Online | LexiClash',
    description: 'Gira la rueda de palabras diaria y encuentra cada palabra escondida. Puzzle gratis online — sin registro, sin descarga. Letras nuevas cada día.',
    ogTitle: 'Rueda de Palabras Diaria — Puzzle Gratis',
    ogDescription: 'Gira la rueda y encuentra todas las palabras. ¡Nuevo puzzle cada día!',
  },
  ru: {
    title: 'Ежедневное колесо слов — Бесплатная онлайн-головоломка | LexiClash',
    description: 'Играйте в бесплатную головоломку Daily Word Wheel — крутите колесо букв, найдите все скрытые слова. Новая задача каждый день, отслеживание полос, глобальная таблица лидеров. Без регистрации, без скачивания.',
    ogTitle: 'Ежедневное колесо слов — Бесплатная головоломка',
    ogDescription: 'Крутите колесо слов, найдите все слова. Новая бесплатная головоломка каждый день — отслеживание полос, глобальная таблица лидеров!',
  },
};

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

function getNestedArray(obj: Record<string, unknown>, path: string): Array<Record<string, string>> {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return [];
    current = (current as Record<string, unknown>)[part];
  }
  return Array.isArray(current) ? current as Array<Record<string, string>> : [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (LOCALES.includes(locale as Locale) ? locale : 'en') as Locale;
  const t = await loadTranslation(validLocale as Language) as Record<string, unknown>;
  const resolve = (key: string, fallback: string) => getNestedValue(t, key) || fallback;

  const pageUrl = `${BASE_URL}/${validLocale}/daily-word-wheel`;

  const languages: Record<string, string> = { 'x-default': `${BASE_URL}/en/daily-word-wheel` };
  LOCALES.forEach((l) => { languages[l] = `${BASE_URL}/${l}/daily-word-wheel`; });
  languages['en-US'] = `${BASE_URL}/en/daily-word-wheel`;
  languages['en-GB'] = `${BASE_URL}/en/daily-word-wheel`;
  languages['he-IL'] = `${BASE_URL}/he/daily-word-wheel`;
  languages['sv-SE'] = `${BASE_URL}/sv/daily-word-wheel`;
  languages['ja-JP'] = `${BASE_URL}/ja/daily-word-wheel`;
  languages['es-ES'] = `${BASE_URL}/es/daily-word-wheel`;
  languages['es-MX'] = `${BASE_URL}/es/daily-word-wheel`;
  languages['es-US'] = `${BASE_URL}/es/daily-word-wheel`;
  languages['ru-RU'] = `${BASE_URL}/ru/daily-word-wheel`;

  const ogLocaleMap: Record<string, string> = { en: 'en_US', he: 'he_IL', sv: 'sv_SE', ja: 'ja_JP', es: 'es_ES', ru: 'ru_RU' };

  const fallback = META_FALLBACK[validLocale];
  return {
    title: resolve('meta.dailyWordWheel.title', fallback.title),
    description: resolve('meta.dailyWordWheel.description', fallback.description),
    keywords: KEYWORDS[validLocale],
    openGraph: {
      title: resolve('meta.dailyWordWheel.ogTitle', fallback.ogTitle),
      description: resolve('meta.dailyWordWheel.ogDescription', fallback.ogDescription),
      locale: ogLocaleMap[validLocale] || 'en_US',
      type: 'website',
      url: pageUrl,
      siteName: 'LexiClash',
      images: [{ url: `${BASE_URL}/${validLocale}/daily-word-wheel/opengraph-image`, width: 1200, height: 630, alt: resolve('meta.dailyWordWheel.ogTitle', fallback.ogTitle) }],
    },
    twitter: {
      card: 'summary_large_image',
      title: resolve('meta.dailyWordWheel.ogTitle', fallback.ogTitle),
      description: resolve('meta.dailyWordWheel.ogDescription', fallback.ogDescription),
      images: [`${BASE_URL}/${validLocale}/daily-word-wheel/opengraph-image`],
    },
    alternates: {
      canonical: pageUrl,
      languages,
    },
    robots: { index: true, follow: true },
  };
}

export default async function DailyWordWheelPage({ params }: PageProps) {
  const { locale } = await params;
  const validLocale = (LOCALES.includes(locale as Locale) ? locale : 'en') as Locale;
  const t = await loadTranslation(validLocale as Language) as Record<string, unknown>;
  const resolve = (key: string, fallback: string) => getNestedValue(t, key) || fallback;
  const faqItems = getNestedArray(t, 'dailyWordWheelLanding.faq.items');

  const steps = [
    { step: '1', title: resolve('dailyWordWheelLanding.steps.1.title', 'New puzzle daily'), desc: resolve('dailyWordWheelLanding.steps.1.desc', 'A fresh wheel of letters appears every day at midnight UTC.') },
    { step: '2', title: resolve('dailyWordWheelLanding.steps.2.title', 'Find words'), desc: resolve('dailyWordWheelLanding.steps.2.desc', 'Form words using the wheel letters.') },
    { step: '3', title: resolve('dailyWordWheelLanding.steps.3.title', 'Beat the clock'), desc: resolve('dailyWordWheelLanding.steps.3.desc', 'Find as many words as possible before time runs out.') },
    { step: '4', title: resolve('dailyWordWheelLanding.steps.4.title', 'Compare globally'), desc: resolve('dailyWordWheelLanding.steps.4.desc', 'See how you rank on the daily leaderboard.') },
  ];

  // All content below is from static translation constants — safe for structured data injection
  const structuredDataPayload = [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: resolve('dailyWordWheelLanding.steps.heading', 'How to Play the Daily Word Wheel'),
      description: resolve('dailyWordWheelLanding.hero.description', 'Learn how to play the Daily Word Wheel puzzle.'),
      totalTime: 'PT5M',
      tool: { '@type': 'HowToTool', name: 'Web browser' },
      supply: { '@type': 'HowToSupply', name: 'Internet connection' },
      step: steps.map((s, i) => ({
        '@type': 'HowToStep', position: i + 1, name: s.title, text: s.desc,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'LexiClash Daily Word Wheel',
      url: `${BASE_URL}/${validLocale}/daily/word-wheel`,
      applicationCategory: 'GameApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: ['New puzzle every day at midnight UTC', 'Global daily leaderboard', 'No download or signup required', '5 language support', 'Mobile-friendly browser game'],
      browserRequirements: 'Requires a modern web browser',
      inLanguage: LOCALES,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'LexiClash', item: `${BASE_URL}/${validLocale}` },
        { '@type': 'ListItem', position: 2, name: resolve('dailyWordWheelLanding.hero.title', 'Daily Word Wheel'), item: `${BASE_URL}/${validLocale}/daily-word-wheel` },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <TopBackLink className="mb-4" />
      {/* Static JSON-LD — all content from translation constants, no user input, safe */}
      <script
        type="application/ld+json"

        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredDataPayload) }}
      />

      <AnimatedLanding
        locale={validLocale}
        hero={{
          title: resolve('dailyWordWheelLanding.hero.title', 'Daily Word Wheel'),
          subtitle: resolve('dailyWordWheelLanding.hero.subtitle', 'Free Daily Word Puzzle'),
          description: resolve('dailyWordWheelLanding.hero.description', 'A new word wheel puzzle every day.'),
          cta: resolve('dailyWordWheelLanding.hero.cta', "Play Today's Word Wheel"),
          leaderboard: resolve('dailyWordWheelLanding.hero.leaderboard', 'View World Record'),
        }}
        steps={steps}
        stepsHeading={resolve('dailyWordWheelLanding.steps.heading', 'How the Daily Word Wheel Works')}
        faqHeading={resolve('dailyWordWheelLanding.faq.heading', 'Frequently Asked Questions')}
        faqItems={faqItems}
        finalCta={{
          heading: resolve('dailyWordWheelLanding.finalCta.heading', "Play Today's Puzzle"),
          description: resolve('dailyWordWheelLanding.finalCta.description', 'The Daily Word Wheel resets every day.'),
          button: resolve('dailyWordWheelLanding.finalCta.button', 'Play Daily Word Wheel Now'),
        }}
      />
    </main>
  );
}
