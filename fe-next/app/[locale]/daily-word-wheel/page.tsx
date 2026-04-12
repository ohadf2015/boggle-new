import type { Metadata } from 'next';
import { loadTranslation } from '@/translations/loadTranslation';
import type { Language } from '@/types';
import { AnimatedLanding } from './AnimatedLanding';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';
const LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];

// SEO keywords per locale
const KEYWORDS: Record<Locale, string> = {
  en: 'daily word wheel, daily word puzzle, word wheel game, free daily word game, word wheel online, daily word challenge, wordle alternative daily',
  he: 'גלגל מילים יומי, פאזל מילים, משחק מילים חינם, משחק מילים יומי, אתגר מילים',
  sv: 'dagligt ordhjul, ordpussel, gratis ordspel, dagligt ordspel, ordhjul online',
  ja: 'デイリーワードホイール, ワードパズル, 無料ワードゲーム, 毎日のワードゲーム',
  es: 'rueda de palabras diaria, puzzle de palabras, juego de palabras gratis, juego de palabras diario',
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

  const ogLocaleMap: Record<string, string> = { en: 'en_US', he: 'he_IL', sv: 'sv_SE', ja: 'ja_JP', es: 'es_ES' };

  return {
    title: resolve('meta.dailyWordWheel.title', 'Daily Word Wheel - Free Daily Puzzle | LexiClash'),
    description: resolve('meta.dailyWordWheel.description', 'Spin the daily word wheel! Find all possible words from a set of letters. New puzzle every day.'),
    keywords: KEYWORDS[validLocale],
    openGraph: {
      title: resolve('meta.dailyWordWheel.ogTitle', 'Daily Word Wheel - Free Puzzle'),
      description: resolve('meta.dailyWordWheel.ogDescription', 'Spin the word wheel and find all possible words. New puzzle daily!'),
      locale: ogLocaleMap[validLocale] || 'en_US',
      type: 'website',
      url: pageUrl,
      siteName: 'LexiClash',
      images: [{ url: `${BASE_URL}/${validLocale}/daily-word-wheel/opengraph-image`, width: 1200, height: 630, alt: resolve('meta.dailyWordWheel.ogTitle', 'Daily Word Wheel') }],
    },
    twitter: {
      card: 'summary_large_image',
      title: resolve('meta.dailyWordWheel.ogTitle', 'Daily Word Wheel - Free Puzzle'),
      description: resolve('meta.dailyWordWheel.ogDescription', 'Spin the word wheel and find all possible words. New puzzle daily!'),
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
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.7', ratingCount: '890', bestRating: '5', worstRating: '1' },
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
