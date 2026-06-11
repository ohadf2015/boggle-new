import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import VocabularyPageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'vocabulary-building-strategies';
const DATE_PUBLISHED = '2026-03-05';
const DATE_MODIFIED = '2026-05-19';

const metaTitles: Record<string, string> = {
  en: 'I Learned 500 New Words in 30 Days - Vocabulary Building Strategies',
  he: 'למדתי 500 מילים חדשות ב-30 יום - אסטרטגיות בניית אוצר מילים',
  sv: 'Jag larde mig 500 nya ord pa 30 dagar - Strategier for ordforrad',
  ja: '30日で500の新単語を習得 - 語彙構築戦略',
  es: 'Aprendi 500 palabras en 30 dias - Estrategias de vocabulario',
};

const metaDescriptions: Record<string, string> = {
  en: 'Learn how spaced repetition, active recall, and word games helped me learn 500 new words in 30 days. Research-backed vocabulary building strategies that work.',
  he: 'גלו כיצד חזרה מרווחת, שליפה אקטיבית ומשחקי מילים עזרו לי ללמוד 500 מילים חדשות ב-30 יום. אסטרטגיות מבוססות מחקר.',
  sv: 'Lar dig hur utspridd repetition, aktiv aterkallelse och ordspel hjalpte mig att lara mig 500 nya ord pa 30 dagar.',
  ja: '間隔反復、能動的想起、ワードゲームで30日間に500の新単語を習得した方法。研究に裏付けされた語彙構築戦略。',
  es: 'Descubre como la repeticion espaciada, el recuerdo activo y los juegos de palabras me ayudaron a aprender 500 palabras nuevas en 30 dias.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function VocabularyPage({ params }: PageProps) {
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
      <VocabularyPageClient />
    </>
  );
}
