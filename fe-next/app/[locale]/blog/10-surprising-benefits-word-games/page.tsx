import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import BenefitsPageClient from './PageClient';
import { contentByLocale } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = '10-surprising-benefits-word-games';
const DATE_PUBLISHED = '2025-06-15';
const DATE_MODIFIED = '2026-02-20';

const metaTitles: Record<string, string> = {
  en: '10 Benefits of Word Games - Science-Backed Brain Benefits',
  he: '10 יתרונות מדעיים של משחקי מילים לבריאות המוח',
  sv: '10 Vetenskapliga Fördelar med Ordspel för Hjärnan',
  ja: 'ワードゲームの科学的に証明された10の脳への効果',
  es: '10 Beneficios Científicos de los Juegos de Palabras',
};

const metaDescriptions: Record<string, string> = {
  en: 'Discover 10 science-backed benefits of playing word games daily. From sharper memory to reduced dementia risk, learn why experts recommend free word games for brain health.',
  he: 'גלו 10 יתרונות מוכחים מדעית של משחקי מילים. משיפור הזיכרון ועד הפחתת סיכון לדמנציה - למדו למה מומחים ממליצים על משחקי מילים.',
  sv: 'Upptäck 10 vetenskapligt bevisade fördelar med att spela ordspel dagligen. Från skarpare minne till minskad demensrisk.',
  ja: 'ワードゲームの科学的に証明された10の効果を発見。記憶力向上から認知症リスク低減まで、専門家が推奨する理由を解説。',
  es: 'Descubre 10 beneficios científicos de jugar juegos de palabras. Desde mejor memoria hasta menor riesgo de demencia.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED });
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
