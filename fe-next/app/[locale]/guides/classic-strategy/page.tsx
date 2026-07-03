import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import ClassicStrategyPageClient from './PageClient';
import { contentByLocale } from './content';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SITE_URL = 'https://www.lexiclash.live';
const SLUG = 'classic-strategy';
const DATE_PUBLISHED = '2026-03-10';

const metaTitles: Record<string, string> = {
  en: 'Classic Mode Strategy Guide - Find More Words, Score Higher | LexiClash',
  he: 'מדריך אסטרטגיה למצב קלאסי - מצאו יותר מילים | לקסיקלאש',
  sv: 'Strategiguide for Klassiskt Lage - Hitta Fler Ord | LexiClash',
  ja: 'クラシックモード攻略ガイド - もっと単語を見つけよう | LexiClash',
  es: 'Guia de Estrategia Modo Clasico - Encuentra Mas Palabras | LexiClash',
};

const metaDescriptions: Record<string, string> = {
  en: 'Master LexiClash Classic mode with proven scanning patterns, time management tips, and scoring strategies. Learn the corner-edge-center technique used by top 10% players.',
  he: 'שלטו במצב קלאסי של לקסיקלאש עם טכניקות סריקה מוכחות, ניהול זמן ואסטרטגיות ניקוד. למדו את טכניקת פינה-שוליים-מרכז.',
  sv: 'Bemestra LexiClash Klassiskt lage med bevisade skanningsmonster, tidshanteringstips och poangstrategier.',
  ja: 'LexiClashクラシックモードを実証済みのスキャンパターン、時間管理のヒント、スコアリング戦略でマスターしましょう。',
  es: 'Domina el modo Clasico de LexiClash con patrones de escaneo probados, consejos de gestion del tiempo y estrategias de puntuacion.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return {
    title,
    description,
    openGraph: {
      type: 'article',
      title,
      description,
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
        ru: `${SITE_URL}/ru/guides/${SLUG}`,
        'en-IL': `${SITE_URL}/en/guides/${SLUG}`,
        'he-IL': `${SITE_URL}/he/guides/${SLUG}`,
        'en-US': `${SITE_URL}/en/guides/${SLUG}`,
        'es-US': `${SITE_URL}/es/guides/${SLUG}`,
        'en-GB': `${SITE_URL}/en/guides/${SLUG}`,
        'en-SE': `${SITE_URL}/en/guides/${SLUG}`,
        'sv-SE': `${SITE_URL}/sv/guides/${SLUG}`,
        'en-JP': `${SITE_URL}/en/guides/${SLUG}`,
        'ja-JP': `${SITE_URL}/ja/guides/${SLUG}`,
        'en-ES': `${SITE_URL}/en/guides/${SLUG}`,
        'es-ES': `${SITE_URL}/es/guides/${SLUG}`,
        'en-MX': `${SITE_URL}/en/guides/${SLUG}`,
        'es-MX': `${SITE_URL}/es/guides/${SLUG}`,
        'en-AU': `${SITE_URL}/en/guides/${SLUG}`,
        'es-AR': `${SITE_URL}/es/guides/${SLUG}`,
        'es-CO': `${SITE_URL}/es/guides/${SLUG}`,
        'ru-RU': `${SITE_URL}/ru/guides/${SLUG}`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function ClassicStrategyPage({ params }: PageProps) {
  const { locale } = await params;
  const content = contentByLocale[locale] || contentByLocale.en;

  // Safe: all content is from static constants defined in content.ts, not user input
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


  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: content.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <>
      {/* Safe: all content is from static blog data constants, not user input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: `${SITE_URL}/${locale}` },
        { name: 'Guides', url: `${SITE_URL}/${locale}/guides` },
        { name: content.title, url: `${SITE_URL}/${locale}/guides/${SLUG}` },
      ]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <ClassicStrategyPageClient />
    </>
  );
}
