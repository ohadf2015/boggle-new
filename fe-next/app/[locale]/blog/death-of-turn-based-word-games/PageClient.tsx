'use client';

import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { RelatedArticles } from '@/components/blog/RelatedArticles';
import { contentByLocale } from './content';
import { AuthorBioCard } from '@/components/blog/AuthorBioCard';
import { BlogPostLayout, BlogSections } from '@/components/blog/BlogPostLayout';

export default function DeathOfTurnBasedWordGamesPageClient(): React.ReactElement {
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
  const relatedArticlesData = [
    { slug: 'boggle-vs-words-with-friends', title: 'Boggle vs Words With Friends: One Respects Your Time', excerpt: '', readTime: '9 min read', category: 'Versus', image: '' },
    { slug: 'multiplayer-word-games-social', title: 'Multiplayer Word Games Are the New Game Night', excerpt: '', readTime: '8 min read', category: 'Social', image: '' },
    { slug: 'free-word-games-online', title: 'Free Word Games Online: The Honest Guide', excerpt: '', readTime: '9 min read', category: 'Reviews', image: '' },
    { slug: 'best-boggle-alternatives-2026', title: 'Best Boggle Alternatives in 2026', excerpt: '', readTime: '10 min read', category: 'Reviews', image: '' },
    { slug: 'multiplayer-strategy-guide', title: 'The Multiplayer Strategy Guide', excerpt: '', readTime: '10 min read', category: 'Strategy', image: '' },
    { slug: 'netflix-word-game-2026-rise', title: 'Netflix Just Dropped a Word Game', excerpt: '', readTime: '7 min read', category: 'Trends', image: '' },
    { slug: 'why-word-games-are-addictive', title: 'Why You Can\'t Stop Playing Word Games', excerpt: '', readTime: '11 min read', category: 'Psychology', image: '' },
    { slug: 'word-game-history', title: 'The Surprising History of Word Games', excerpt: '', readTime: '8 min read', category: 'History', image: '' },
    { slug: 'most-popular-word-games-2026', title: 'The Most Popular Word Games of 2026', excerpt: '', readTime: '9 min read', category: 'Trends', image: '' },
  ];

  return (
    <BlogPostLayout
      locale={locale}
      backLabel={content.backToBlog}
      category={content.category}
      categoryTone="orange"
      title={content.title}
      subtitle={content.subtitle}
      date="2026-09-12"
      readTime={content.readTime}
      image={{ src: "/images/blog/multiplayer-social.jpg", alt: "A group of friends playing a real-time word game together on a shared letter grid" }}
      ctas={[
        { href: `/${locale}/daily`, label: content.playDaily },
        { href: `/${locale}/quick-play`, label: content.startPracticing },
      ]}
      after={
        <>
          <AuthorBioCard />
          <RelatedArticles
            currentSlug="death-of-turn-based-word-games"
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
