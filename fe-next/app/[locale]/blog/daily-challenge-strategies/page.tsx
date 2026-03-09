import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import StrategiesPageClient from './PageClient';
import { contentByLocale } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'daily-challenge-strategies';
const DATE_PUBLISHED = '2025-06-15';

const metaTitles: Record<string, string> = {
  en: 'Daily Word Game Strategies - Tips to Beat the Puzzle',
  he: 'אסטרטגיות לאתגר המילים היומי - טיפים לניצחון',
  sv: 'Dagliga Ordpussel Strategier - Tips för Att Vinna',
  ja: 'デイリーワードパズル攻略法 - スコアを最大化するコツ',
  es: 'Estrategias para el Reto Diario de Palabras',
};

const metaDescriptions: Record<string, string> = {
  en: 'Master daily word challenges with expert strategies. Learn proven tactics to maximize your score and climb leaderboards in free daily word puzzle games.',
  he: 'שלטו באתגר המילים היומי עם אסטרטגיות מומחים. למדו טקטיקות מוכחות למקסום הציון שלכם במשחקי מילים יומיים.',
  sv: 'Bemästra dagliga ordutmaningar med expertstrategier. Lär dig beprövade taktiker för att maximera din poäng.',
  ja: 'デイリーワードチャレンジをマスターする攻略法。スコアを最大化しリーダーボードを上るための実証済みの戦術を学ぶ。',
  es: 'Domina los retos diarios de palabras con estrategias expertas. Aprende tácticas probadas para maximizar tu puntuación.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED });
}

export default async function StrategiesPage({ params }: PageProps) {
  const { locale } = await params;
  const content = contentByLocale[locale] || contentByLocale.en;

  return (
    <>
      <BlogPostingJsonLd
        title={content.title}
        description={metaDescriptions[locale] || metaDescriptions.en}
        slug={SLUG}
        locale={locale}
        datePublished={DATE_PUBLISHED}
      />
      <StrategiesPageClient />
    </>
  );
}
