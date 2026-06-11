import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import BenefitsPageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = '10-surprising-benefits-word-games';
const DATE_PUBLISHED = '2025-06-15';
const DATE_MODIFIED = '2026-05-19';

const metaTitles: Record<string, string> = {
  en: '10 Benefits of Playing Word Games Daily - Science-Backed Results',
  he: '10 יתרונות מוכחים של משחקי מילים - למה שווה לשחק כל יום',
  sv: '10 Fördelar med Att Spela Ordspel Dagligen - Vetenskapligt Bevisat',
  ja: 'ワードゲームを毎日プレイする10の科学的メリット',
  es: '10 Beneficios de Jugar Juegos de Palabras Cada Día',
};

const metaDescriptions: Record<string, string> = {
  en: 'Are there benefits to playing word games? Yes — 10 science-backed benefits of playing word games daily. From sharper memory to vocabulary building, learn why free word making games like Boggle and Wordle boost brain health. 19,000-person study results inside.',
  he: 'האם יש יתרונות למשחקי מילים? כן — 10 יתרונות מוכחים מדעית. משיפור הזיכרון ועד בניית אוצר מילים, למדו למה שווה לשחק משחקי מילים בעברית בחינם כל יום.',
  sv: 'Finns det fördelar med att spela ordspel? Ja — 10 vetenskapligt bevisade fördelar med dagligt spelande. Från skarpare minne till ordförrådsbyggande.',
  ja: 'ワードゲームをプレイするメリットは？科学的に証明された10の効果。記憶力向上から語彙構築まで、毎日の無料ワードゲームが脳の健康を高める理由。',
  es: '¿Hay beneficios de jugar juegos de palabras? Sí — 10 beneficios científicos de jugar diariamente. Desde mejor memoria hasta construcción de vocabulario.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function BenefitsPage({ params }: PageProps) {
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
      <BenefitsPageClient />
    </>
  );
}
