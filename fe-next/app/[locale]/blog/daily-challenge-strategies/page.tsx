import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import StrategiesPageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'daily-challenge-strategies';
const DATE_PUBLISHED = '2025-07-22';
const DATE_MODIFIED = '2026-02-15';

const metaTitles: Record<string, string> = {
  en: 'Daily Word Wheel Strategies - Tips to Beat the Daily Challenge',
  he: 'אסטרטגיות לאתגר המילים היומי - טיפים למקסום ניקוד',
  sv: 'Dagliga Ordhjulet Strategier - Tips för Att Vinna Utmaningen',
  ja: 'デイリーワードホイール攻略法 - 世界記録への道',
  es: 'Estrategias para el Reto Diario de Palabras - Tips para Ganar',
};

const metaDescriptions: Record<string, string> = {
  en: 'Master the daily word wheel challenge with expert strategies. Learn proven tactics to find more words, maximize your score, and climb leaderboards in free daily word puzzle games like Wordle and Boggle. Tips for word hunt and competitive word finding.',
  he: 'שלטו באתגר המילים היומי עם אסטרטגיות מומחים. למדו טקטיקות מוכחות למקסום הציון שלכם במשחקי מילים יומיים. כמו וורדל אבל עם מרובה משתתפים.',
  sv: 'Bemästra det dagliga ordhjulet med expertstrategier. Lär dig beprövade taktiker för att maximera din poäng i dagliga ordutmaningar.',
  ja: 'デイリーワードホイールチャレンジをマスターする攻略法。世界記録に挑戦！スコアを最大化しリーダーボードを上るための実証済みの戦術。',
  es: 'Domina el reto diario de la rueda de palabras con estrategias expertas. Tácticas probadas para maximizar tu puntuación y subir en la clasificación.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function StrategiesPage({ params }: PageProps) {
  const { locale } = await params;
  const content = contentByLocale[locale] || contentByLocale.en;

  const siteUrl = 'https://www.lexiclash.live';
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: `${siteUrl}/${locale}` },
        { name: 'Blog', url: `${siteUrl}/${locale}/blog` },
        { name: content.title, url: `${siteUrl}/${locale}/blog/${SLUG}` },
      ]} />
      <BlogPostingJsonLd
        title={content.title}
        description={metaDescriptions[locale] || metaDescriptions.en}
        slug={SLUG}
        locale={locale}
        datePublished={DATE_PUBLISHED}
        dateModified={DATE_MODIFIED}
      />
      <StrategiesPageClient />
    </>
  );
}
