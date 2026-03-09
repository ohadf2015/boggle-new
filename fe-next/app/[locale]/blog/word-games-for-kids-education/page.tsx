import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import WordGamesEducationPageClient from './PageClient';
import { contentByLocale } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'word-games-for-kids-education';
const DATE_PUBLISHED = '2026-03-09';

const metaTitles: Record<string, string> = {
  en: 'Word Games for Education - Why Teachers Need Them in 2026',
  he: 'משחקי מילים בחינוך - למה מורים צריכים אותם ב-2026',
  sv: 'Ordspel för Utbildning - Varför Lärare Behöver Dem 2026',
  ja: '教育のためのワードゲーム - 2026年に教師が必要とする理由',
  es: 'Juegos de Palabras para Educación - Por Qué los Profesores los Necesitan en 2026',
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

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED });
}

export default async function WordGamesEducationPage({ params }: PageProps) {
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
      <WordGamesEducationPageClient />
    </>
  );
}
