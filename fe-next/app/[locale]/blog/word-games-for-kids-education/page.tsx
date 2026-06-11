import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import WordGamesEducationPageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'word-games-for-kids-education';
const DATE_PUBLISHED = '2026-01-27';
const DATE_MODIFIED = '2026-05-19';

const metaTitles: Record<string, string> = {
  en: 'Free Word Games for Kids & Education - Spelling & Vocabulary Building',
  he: 'משחקי מילים חינוכיים לילדים בעברית - איות ואוצר מילים',
  sv: 'Gratis Ordspel för Barn & Utbildning - Stavning & Ordförråd',
  ja: '子供向け無料ワードゲーム＆教育 - スペルと語彙',
  es: 'Juegos de Palabras Gratis para Niños - Ortografía y Vocabulario',
};

const metaDescriptions: Record<string, string> = {
  en: 'Research-backed guide to using word games in K-12 classrooms. Vocabulary acquisition, ESL benefits, differentiated instruction, and assessment through play.',
  he: 'מדריך מבוסס מחקר לשימוש במשחקי מילים בכיתות. רכישת אוצר מילים, יתרונות לאנגלית כשפה שנייה, הוראה מותאמת והערכה דרך משחק.',
  sv: 'Forskningsbaserad guide till ordspel i klassrummet. Ordförrådsförvärv, ESL-fördelar, differentierad undervisning och bedömning genom spel.',
  ja: 'K-12教室でのワードゲーム活用の研究に基づくガイド。語彙習得、ESLの利点、差別化指導、遊びを通じた評価。',
  es: 'Guía respaldada por investigación para usar juegos de palabras en el aula K-12. Adquisición de vocabulario, beneficios ESL e instrucción diferenciada.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function WordGamesEducationPage({ params }: PageProps) {
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
      <WordGamesEducationPageClient />
    </>
  );
}
