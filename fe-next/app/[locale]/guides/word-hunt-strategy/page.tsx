import type { Metadata } from 'next';
import WordHuntStrategyPageClient from './PageClient';
import { contentByLocale } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SITE_URL = 'https://www.lexiclash.live';
const SLUG = 'word-hunt-strategy';
const DATE_PUBLISHED = '2026-03-10';

const metaTitles: Record<string, string> = {
  en: 'Word Hunt Strategy: Find the Hidden Word in Fewer Attempts | LexiClash',
  he: 'אסטרטגיית ציד מילים: מצאו את המילה הנסתרת בפחות ניסיונות | לקסיקלאש',
  sv: 'Word Hunt Strategi: Hitta det Dolda Ordet pa Farre Forsok | LexiClash',
  ja: 'ワードハント攻略：より少ない試行で隠された単語を見つける | LexiClash',
  es: 'Estrategia Word Hunt: Encuentra la Palabra Oculta en Menos Intentos | LexiClash',
};

const metaDescriptions: Record<string, string> = {
  en: 'Master LexiClash Word Hunt with elimination strategies, clue interpretation, and advanced deduction techniques. Improve your solve rate and find hidden words faster.',
  he: 'שלטו בציד מילים של לקסיקלאש עם אסטרטגיות אלימינציה, פירוש רמזים וטכניקות דדוקציה מתקדמות.',
  sv: 'Bemestra LexiClash Word Hunt med elimineringsstrategier, ledtradstolkning och avancerade deduktionstekniker.',
  ja: 'LexiClashワードハントを消去法、ヒントの解釈、高度な推論テクニックでマスター。',
  es: 'Domina Word Hunt de LexiClash con estrategias de eliminacion, interpretacion de pistas y tecnicas avanzadas de deduccion.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return {
    title, description,
    openGraph: {
      type: 'article', title, description,
      url: `${SITE_URL}/${locale}/guides/${SLUG}`,
      siteName: 'LexiClash', publishedTime: DATE_PUBLISHED,
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

export default async function WordHuntStrategyPage({ params }: PageProps) {
  const { locale } = await params;
  const content = contentByLocale[locale] || contentByLocale.en;

  const howToSchema = {
    '@context': 'https://schema.org', '@type': 'HowTo',
    name: content.title, description: content.subtitle,
    url: `${SITE_URL}/${locale}/guides/${SLUG}`,
    datePublished: DATE_PUBLISHED, inLanguage: locale,
    step: content.sections.map((s, i) => ({
      '@type': 'HowToStep', position: i + 1,
      name: s.title || `Step ${i + 1}`, text: s.content.substring(0, 200),
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/${locale}/guides` },
      { '@type': 'ListItem', position: 3, name: content.title, item: `${SITE_URL}/${locale}/guides/${SLUG}` },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: content.faq.map((item) => ({
      '@type': 'Question', name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  // Safe: all JSON-LD content sourced from static constants in content.ts, not user input
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <WordHuntStrategyPageClient />
    </>
  );
}
