import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import SecretsPageClient from './PageClient';
import { contentByLocale } from './content';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'top-player-secrets';
const DATE_PUBLISHED = '2025-08-28';
const DATE_MODIFIED = '2026-05-19';

const metaTitles: Record<string, string> = {
  en: '7 Word Game Secrets Top Players Use - Free Tips',
  he: '7 סודות של שחקני מילים מקצועיים',
  sv: '7 Hemligheter Toppspelare Använder i Ordspel',
  ja: 'トップワードゲームプレイヤーの7つの秘密',
  es: '7 Secretos de Jugadores Profesionales de Palabras',
};

const metaDescriptions: Record<string, string> = {
  en: 'Discover insider techniques that separate champions from casual players. Learn psychological tricks, practice methods, and strategies used by top word game players.',
  he: 'גלו טכניקות פנימיות שמפרידות בין אלופים לשחקנים מזדמנים. למדו טריקים פסיכולוגיים ושיטות אימון של שחקני מילים מובילים.',
  sv: 'Upptäck insidertekniker som skiljer mästare från nybörjare. Lär dig psykologiska trick och övningsmetoder.',
  ja: 'チャンピオンとカジュアルプレイヤーを分ける内部テクニックを発見。心理的トリック、練習方法、競技戦略を学ぶ。',
  es: 'Descubre técnicas internas que separan a los campeones. Aprende trucos psicológicos y estrategias competitivas.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function SecretsPage({ params }: PageProps) {
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
      <SecretsPageClient />
    </>
  );
}
