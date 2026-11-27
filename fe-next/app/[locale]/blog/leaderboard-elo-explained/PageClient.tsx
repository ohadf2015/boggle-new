'use client';

import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { RelatedArticles } from '@/components/blog/RelatedArticles';
import { contentByLocale } from './content';
import { AuthorBioCard } from '@/components/blog/AuthorBioCard';
import { BlogPostLayout, BlogSections } from '@/components/blog/BlogPostLayout';

export default function LeaderboardEloPageClient(): React.ReactElement {
  const { language } = useLanguage();
  const params = useParams();
  const locale = (params.locale as string) || language;

  const content = contentByLocale[locale] || contentByLocale.en;

  const relatedHeadingByLocale: Record<string, string> = {
    en: 'You Might Also Like',
    he: 'אולי יעניין אותך גם',
    sv: 'Du kanske också gillar',
    ja: 'こちらもおすすめ',
    es: 'También te puede interesar',
  };
  const relatedHeading = relatedHeadingByLocale[locale] || relatedHeadingByLocale.en;

  const blogIndexContent = {
    en: {
      'multiplayer-strategy-guide': { title: 'The Multiplayer Strategy Guide', excerpt: 'How to actually win real-time word battles.', readTime: '10 min read', category: 'Strategy' },
      'top-player-secrets': { title: '7 Secrets Top Players Don\'t Want You to Know', excerpt: 'Insider techniques from champions.', readTime: '9 min read', category: 'Secrets' },
      'daily-challenge-strategies': { title: '7 Proven Daily Challenge Strategies', excerpt: 'Master expert tactics to maximize your score.', readTime: '7 min read', category: 'Strategy' },
      'improve-word-game-skills': { title: 'How to Improve Your Word Game Skills', excerpt: 'Proven strategies from vocabulary expansion to pattern recognition.', readTime: '8 min read', category: 'Strategy' },
    },
  };
  const articleMap = blogIndexContent.en;
  const relatedArticlesData = Object.entries(articleMap).map(([slug, data]) => ({
    slug,
    ...data,
    image: '',
  }));

  return (
    <BlogPostLayout
      locale={locale}
      backLabel={content.backToBlog}
      category={content.category}
      categoryTone="cyan"
      title={content.title}
      subtitle={content.subtitle}
      date="2026-08-03"
      readTime={content.readTime}
      image={{ src: "/images/blog/top-player-secrets.jpg", alt: "LexiClash leaderboard with ranked players and ELO ratings" }}
      ctas={[
        { href: `/${locale}/leaderboard`, label: content.tryDaily },
        { href: `/${locale}/multiplayer`, label: content.practice },
      ]}
      after={
        <>
          <AuthorBioCard />
          <RelatedArticles
            currentSlug="leaderboard-elo-explained"
            locale={locale}
            heading={relatedHeading}
            articles={relatedArticlesData}
          />
        </>
      }
    >
      <BlogSections sections={content.sections} />
    </BlogPostLayout>
  );
}
