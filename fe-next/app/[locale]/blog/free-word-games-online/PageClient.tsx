'use client';

import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { RelatedArticles } from '@/components/blog/RelatedArticles';
import { contentByLocale } from './content';
import { AuthorBioCard } from '@/components/blog/AuthorBioCard';
import { BlogPostLayout, BlogSections } from '@/components/blog/BlogPostLayout';

export default function FreeWordGamesOnlinePageClient(): React.ReactElement {
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
    { slug: 'best-boggle-alternatives-2026', title: 'Word Games Like Boggle: 6 Free Alternatives', excerpt: '', readTime: '10 min read', category: 'Reviews', image: '' },
    { slug: 'boggle-vs-scrabble', title: 'Boggle vs Scrabble: The Honest Showdown', excerpt: '', readTime: '12 min read', category: 'Versus', image: '' },
    { slug: 'daily-challenge-strategies', title: '7 Proven Daily Challenge Strategies', excerpt: '', readTime: '7 min read', category: 'Strategy', image: '' },
    { slug: '10-surprising-benefits-word-games', title: '10 Surprising Benefits of Playing Word Games Daily', excerpt: '', readTime: '5 min read', category: 'Research', image: '' },
    { slug: 'why-word-games-are-addictive', title: 'Why You Can\'t Stop Playing Word Games', excerpt: '', readTime: '11 min read', category: 'Psychology', image: '' },
    { slug: 'multiplayer-word-games-social', title: 'Multiplayer Word Games and Social Play', excerpt: '', readTime: '8 min read', category: 'Social', image: '' },
    { slug: 'word-games-for-brain-training', title: 'Word Games for Brain Training: The Research', excerpt: '', readTime: '12 min read', category: 'Brain Health', image: '' },
    { slug: 'improve-word-game-skills', title: 'How to Improve Your Word Game Skills', excerpt: '', readTime: '8 min read', category: 'Strategy', image: '' },
    { slug: 'top-player-secrets', title: '7 Secrets Top Players Don\'t Want You to Know', excerpt: '', readTime: '9 min read', category: 'Secrets', image: '' },
  ];

  return (
    <BlogPostLayout
      locale={locale}
      backLabel={content.backToBlog}
      category={content.category}
      categoryTone="lime"
      title={content.title}
      subtitle={content.subtitle}
      date="2026-05-11"
      readTime={content.readTime}
      image={{ src: "/images/blog/free-word-games-online.jpg", alt: "A phone displaying a word game grid with a coffee cup beside it on a wooden desk" }}
      ctas={[
        { href: `/${locale}/daily`, label: content.playDaily },
        { href: `/${locale}/multiplayer`, label: content.startPracticing },
      ]}
      after={
        <>
          <AuthorBioCard />
          <RelatedArticles
            currentSlug="free-word-games-online"
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
