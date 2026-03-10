import type { Metadata } from 'next';
import BlastStrategyPageClient from './PageClient';
import { contentByLocale } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SITE_URL = 'https://www.lexiclash.live';
const SLUG = 'blast-strategy';
const DATE_PUBLISHED = '2026-03-10';

const metaTitles: Record<string, string> = {
  en: 'Blast Mode Mastery: Combos, Chains & High Scores | LexiClash',
  he: 'מצב בלאסט: קומבו, שרשראות וניקוד גבוה | לקסיקלאש',
  sv: 'Blast-lage Mesterskap: Kombos, Kedjor och Hogsta Poang | LexiClash',
  ja: 'ブラストモード攻略：コンボ、チェーン、ハイスコア | LexiClash',
  es: 'Dominio del Modo Blast: Combos, Cadenas y Puntajes Altos | LexiClash',
};

const metaDescriptions: Record<string, string> = {
  en: 'Master LexiClash Blast mode with combo strategies, tile effect guides, and chain techniques. Learn how to maintain high combo multipliers for maximum scores.',
  he: 'שלטו במצב בלאסט של לקסיקלאש עם אסטרטגיות קומבו, מדריכי אפקטי אריחים וטכניקות שרשור.',
  sv: 'Bemestra LexiClash Blast-lage med kombostrategier, platteffektguider och kedjetekniker.',
  ja: 'LexiClashブラストモードをコンボ戦略、タイルエフェクトガイド、チェーンテクニックでマスター。',
  es: 'Domina el modo Blast de LexiClash con estrategias de combo, guias de efectos de fichas y tecnicas de encadenamiento.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return {
    title,
    description,
    openGraph: {
      type: 'article', title, description,
      url: `${SITE_URL}/${locale}/guides/${SLUG}`,
      siteName: 'LexiClash',
      publishedTime: DATE_PUBLISHED,
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: {
      canonical: `${SITE_URL}/${locale}/guides/${SLUG}`,
      languages: {
        'x-default': `${SITE_URL}/en/guides/${SLUG}`,
        he: `${SITE_URL}/he/guides/${SLUG}`,
        en: `${SITE_URL}/en/guides/${SLUG}`,
        sv: `${SITE_URL}/sv/guides/${SLUG}`,
        ja: `${SITE_URL}/ja/guides/${SLUG}`,
        es: `${SITE_URL}/es/guides/${SLUG}`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function BlastStrategyPage({ params }: PageProps) {
  const { locale } = await params;
  const content = contentByLocale[locale] || contentByLocale.en;

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: content.title,
    description: content.subtitle,
    url: `${SITE_URL}/${locale}/guides/${SLUG}`,
    datePublished: DATE_PUBLISHED,
    inLanguage: locale,
    step: content.sections.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title || `Step ${i + 1}`,
      text: s.content.substring(0, 200),
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/${locale}/guides` },
      { '@type': 'ListItem', position: 3, name: content.title, item: `${SITE_URL}/${locale}/guides/${SLUG}` },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: content.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  // Safe: all JSON-LD content sourced from static constants in content.ts, not user input
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <BlastStrategyPageClient />
    </>
  );
}
