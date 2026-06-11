import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import MultilingualPageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'multilingual-word-learning';
const DATE_PUBLISHED = '2025-08-10';
const DATE_MODIFIED = '2026-05-19';

const metaTitles: Record<string, string> = {
  en: 'Learn Languages Through Word Games - Free Multilingual Tips',
  he: 'לימוד שפות דרך משחקי מילים - טיפים חינם',
  sv: 'Lär Dig Språk Genom Ordspel - Gratis Flerspråkiga Tips',
  ja: 'ワードゲームで言語を学ぶ - 無料多言語学習ガイド',
  es: 'Aprende Idiomas con Juegos de Palabras Gratis',
};

const metaDescriptions: Record<string, string> = {
  en: 'Discover how free multilingual word games accelerate vocabulary acquisition. Research-backed strategies for learning Hebrew, English, Swedish, Japanese, and Spanish.',
  he: 'גלו כיצד משחקי מילים רב-לשוניים מאיצים רכישת אוצר מילים. אסטרטגיות מבוססות מחקר ללימוד עברית, אנגלית, שוודית ויפנית.',
  sv: 'Upptäck hur flerspråkiga ordspel påskyndar ordinlärning. Forskningsbaserade strategier för svenska, engelska, hebreiska och japanska.',
  ja: '多言語ワードゲームが語彙習得をどう加速するか発見。ヘブライ語、英語、スウェーデン語、日本語の学習戦略を紹介。',
  es: 'Descubre cómo los juegos de palabras multilingües aceleran el aprendizaje de vocabulario. Estrategias basadas en investigación.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function MultilingualPage({ params }: PageProps) {
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
      <MultilingualPageClient />
    </>
  );
}
