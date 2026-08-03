import type { Metadata } from 'next';
import { BlogPostingJsonLd, generateBlogMetadata } from '@/components/seo/BlogJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import LeaderboardEloPageClient from './PageClient';
import { contentByLocale } from './content';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SLUG = 'leaderboard-elo-explained';
const DATE_PUBLISHED = '2026-08-03';
const DATE_MODIFIED = '2026-08-03';

const metaTitles: Record<string, string> = {
  en: 'How the LexiClash Leaderboard Works — ELO Ratings, Tiers & Seasons Explained',
};

const metaDescriptions: Record<string, string> = {
  en: 'How LexiClash ratings actually work: ELO math for 1v1, Weng-Lin for multiplayer rooms, K-factor calibration, rating deviation, rank tier thresholds (Bronze to Grandmaster), and seasons. Explained from the real code.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return generateBlogMetadata({ slug: SLUG, locale, title, description, datePublished: DATE_PUBLISHED, dateModified: DATE_MODIFIED, hasTranslation: locale in metaTitles });
}

export default async function LeaderboardEloPage({ params }: PageProps) {
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
        keywords="elo rating explained, word game leaderboard, lexiclash ranks, ranked tiers, glicko, trueskill, openskill"
        articleSection="Guide"
        faqItems={[
          {
            question: 'What rating do new LexiClash players start at?',
            answer: 'Every new player starts at a rating of 1000 with a rating deviation (RD) of 350, meaning the system is highly uncertain about their skill. RD shrinks toward a floor of 50 as more games are played.',
          },
          {
            question: 'Why does my rating change so much in my first games?',
            answer: 'Your first 30 ranked games use a K-factor of 40 (vs 32 afterward) combined with high rating uncertainty, so each game can move your rating significantly. This calibration phase places you at the right skill level faster.',
          },
          {
            question: 'How is multiplayer placement rated differently from 1v1?',
            answer: 'Head-to-head games use classic ELO expected-score math. Multiplayer rooms use the Weng-Lin algorithm (openskill), which processes final placements across the entire field at once, so finishing 2nd of 12 is correctly rated as a strong result.',
          },
          {
            question: 'What are the LexiClash rank tiers?',
            answer: 'Bronze (800+), Silver (1000+), Gold (1200+), Platinum (1400+), Diamond (1600+), Master (1800+), and Grandmaster (2000+). The system also tracks your peak rating permanently.',
          },
        ]}
      />
      <LeaderboardEloPageClient />
    </>
  );
}
