import type { Metadata } from 'next';
import { BlogPostingJsonLd } from '@/components/seo/BlogJsonLd';
import SecretsPageClient from './PageClient';
import { contentByLocale } from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'top-player-secrets';
const DATE_PUBLISHED = '2025-06-15';

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

export default async function SecretsPage({ params }: PageProps) {
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
      <SecretsPageClient />
    </>
  );
}
