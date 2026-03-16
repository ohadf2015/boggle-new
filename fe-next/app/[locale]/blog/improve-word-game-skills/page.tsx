import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import ImproveSkillsPageClient from './PageClient';
import { contentByLocale } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'improve-word-game-skills';
const DATE_PUBLISHED = '2025-06-15';

const metaTitles: Record<string, string> = {
  en: 'Improve Word Game Skills - Free Boggle & Word Puzzle Tips',
  he: 'שיפור כישורי משחקי מילים - טיפים חינם',
  sv: 'Förbättra Dina Ordspelsfärdigheter - Gratis Tips',
  ja: 'ワードゲームスキルを向上させる - 無料攻略ガイド',
  es: 'Mejora Tus Habilidades en Juegos de Palabras - Tips Gratis',
};

const metaDescriptions: Record<string, string> = {
  en: 'Proven strategies to improve your word game performance. Learn Boggle strategies, pattern recognition, vocabulary building, and free tips from experienced players.',
  he: 'אסטרטגיות מוכחות לשיפור הביצועים שלכם במשחקי מילים. למדו זיהוי תבניות, בניית אוצר מילים וטיפים מנוסים.',
  sv: 'Beprövade strategier för att förbättra din ordspelsprestanda. Lär dig mönsterigenkänning, ordförrådsbyggande och tips.',
  ja: 'ワードゲームのパフォーマンスを向上させる実証済み戦略。パターン認識、語彙構築、経験豊富なプレイヤーからの無料ヒント。',
  es: 'Estrategias probadas para mejorar tu rendimiento en juegos de palabras. Aprende reconocimiento de patrones y vocabulario.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED });
}

export default async function ImproveSkillsPage({ params }: PageProps) {
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
      />
      <ImproveSkillsPageClient />
    </>
  );
}
