import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import HebrewGuidePageClient from './PageClient';
import { contentByLocale } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'hebrew-word-games-guide';
const DATE_PUBLISHED = '2025-07-20';

const metaTitles: Record<string, string> = {
  en: 'Hebrew Word Games Guide - Playing Right-to-Left',
  he: 'מדריך משחקי מילים בעברית - שורשים, RTL וכל מה שביניהם',
  sv: 'Hebreiska Ordspel Guide - Spela Höger till Vänster',
  ja: 'ヘブライ語ワードゲームガイド - 右から左へのプレイ',
  es: 'Guía de Juegos de Palabras en Hebreo - Jugando de Derecha a Izquierda',
};

const metaDescriptions: Record<string, string> = {
  en: 'Discover the unique challenges of Hebrew word games: the shoresh root system, vowel-less reading, RTL design, and Israeli word game culture. Tips for learners included.',
  he: 'גלו את האתגרים הייחודיים של משחקי מילים בעברית: מערכת השורשים, קריאה ללא ניקוד, עיצוב RTL ותרבות משחקי מילים ישראלית.',
  sv: 'Upptäck de unika utmaningarna med hebreiska ordspel: rotsystemet, vokallös läsning, RTL-design och israelisk ordspelskultur.',
  ja: 'ヘブライ語ワードゲームのユニークな挑戦を発見：ショレシュルートシステム、母音なしの読み、RTLデザイン、イスラエルのワードゲーム文化。',
  es: 'Descubre los desafíos únicos de los juegos de palabras en hebreo: el sistema de raíces, lectura sin vocales, diseño RTL y cultura israelí de juegos de palabras.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED });
}

export default async function HebrewGuidePage({ params }: PageProps) {
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
      <HebrewGuidePageClient />
    </>
  );
}
