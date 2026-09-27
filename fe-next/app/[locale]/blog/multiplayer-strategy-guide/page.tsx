import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import MultiplayerStrategyPageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'multiplayer-strategy-guide';
const DATE_PUBLISHED = '2026-08-03';
const DATE_MODIFIED = '2026-08-03';

const metaTitles: Record<string, string> = {
  en: 'Multiplayer Word Game Strategy Guide — How to Win Real-Time Word Battles',
};

const metaDescriptions: Record<string, string> = {
  en: 'A complete multiplayer word game strategy guide: pacing, combo management, room-size tactics, fire rounds, and the mental game. Learn how to win real-time word battles against 2-20 players on a shared grid.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function MultiplayerStrategyPage({ params }: PageProps) {
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
        keywords="multiplayer word game strategy, real-time word battle tips, boggle multiplayer guide, word game combos, lexiclash strategy"
        articleSection="Strategy"
      />
      <MultiplayerStrategyPageClient />
    </>
  );
}
