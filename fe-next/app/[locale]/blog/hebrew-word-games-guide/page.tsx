import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import HebrewGuidePageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'hebrew-word-games-guide';
const DATE_PUBLISHED = '2025-10-24';
const DATE_MODIFIED = '2026-05-19';

const metaTitles: Record<string, string> = {
  en: 'Hebrew Word Games Guide - Free Online משחק מילים בעברית',
  he: 'סקריבל בעברית — משחק מילים חינם | מדריך שלם',
  sv: 'Hebreiska Ordspel Guide - Spela Höger till Vänster Online',
  ja: 'ヘブライ語ワードゲームガイド - 右から左へのプレイ',
  es: 'Guía de Juegos de Palabras en Hebreo - Jugando de Derecha a Izquierda',
};

const metaDescriptions: Record<string, string> = {
  en: 'The complete guide to Hebrew word games online free. Discover the shoresh root system, vowel-less reading, RTL word finding, and Israeli word game culture. Play משחק מילים בעברית חינם — no download needed.',
  he: 'סקריבל בעברית — מדריך שלם חינם. שורשים, קריאה ללא ניקוד, אתגר יומי. ללא הורדה, ללא הרשמה. שחקו עכשיו!',
  sv: 'Upptäck de unika utmaningarna med hebreiska ordspel: rotsystemet, vokallös läsning, RTL-design och israelisk ordspelskultur. Gratis online.',
  ja: 'ヘブライ語ワードゲームのユニークな挑戦を発見：ショレシュルートシステム、母音なしの読み、RTLデザイン、イスラエルのワードゲーム文化。',
  es: 'Descubre los desafíos únicos de los juegos de palabras en hebreo: el sistema de raíces, lectura sin vocales, diseño RTL y cultura israelí.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function HebrewGuidePage({ params }: PageProps) {
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
      <HebrewGuidePageClient />
    </>
  );
}
