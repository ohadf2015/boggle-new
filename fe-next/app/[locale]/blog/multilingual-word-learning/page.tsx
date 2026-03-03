import type { Metadata } from 'next';
import { BlogPostingJsonLd } from '@/components/seo/BlogJsonLd';
import MultilingualPageClient from './PageClient';
import { contentByLocale } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'multilingual-word-learning';
const DATE_PUBLISHED = '2025-06-15';

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

  return {
    title,
    description,
    openGraph: { type: 'article', title, description, url: `https://www.lexiclash.live/${locale}/blog/${SLUG}`, siteName: 'LexiClash' },
    twitter: { card: 'summary_large_image', title, description },
    alternates: {
      canonical: `https://www.lexiclash.live/${locale}/blog/${SLUG}`,
      languages: {
        'x-default': `https://www.lexiclash.live/en/blog/${SLUG}`,
        he: `https://www.lexiclash.live/he/blog/${SLUG}`,
        en: `https://www.lexiclash.live/en/blog/${SLUG}`,
        sv: `https://www.lexiclash.live/sv/blog/${SLUG}`,
        ja: `https://www.lexiclash.live/ja/blog/${SLUG}`,
        es: `https://www.lexiclash.live/es/blog/${SLUG}`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function MultilingualPage({ params }: PageProps) {
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
      <MultilingualPageClient />
    </>
  );
}
