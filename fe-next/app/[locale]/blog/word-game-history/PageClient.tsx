'use client';

import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { InlineBannerAd } from '@/components/ads';
import { RelatedArticles } from '@/components/blog/RelatedArticles';
import { contentByLocale } from './content';
import { AuthorBioCard } from '@/components/blog/AuthorBioCard';
import { BlogPostLayout } from '@/components/blog/BlogPostLayout';

export default function WordGameHistoryPageClient(): React.ReactElement {
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
      '10-surprising-benefits-word-games': { title: '10 Surprising Benefits of Playing Word Games Daily', excerpt: 'Science-backed reasons why word games are essential brain training.', readTime: '5 min read', category: 'Research' },
      'science-behind-word-games': { title: 'The Science Behind Word Games and Brain Health', excerpt: 'Explore the cognitive benefits backed by neuroscience.', readTime: '6 min read', category: 'Science' },
      'daily-challenge-strategies': { title: '7 Proven Daily Challenge Strategies', excerpt: 'Master expert tactics to maximize your score.', readTime: '7 min read', category: 'Strategy' },
      'multilingual-word-learning': { title: 'Multilingual Word Learning Through Games', excerpt: 'How playing in multiple languages supercharges your brain.', readTime: '8 min read', category: 'Language' },
      'top-player-secrets': { title: '7 Secrets Top Players Don\'t Want You to Know', excerpt: 'Insider techniques from champions.', readTime: '9 min read', category: 'Secrets' },
      'improve-word-game-skills': { title: 'How to Improve Your Word Game Skills', excerpt: 'Proven strategies from vocabulary expansion to pattern recognition.', readTime: '8 min read', category: 'Strategy' },
      'why-word-games-are-addictive': { title: 'Why You Can\'t Stop Playing Word Games', excerpt: 'Dopamine, flow states, and the psychology of "one more round."', readTime: '11 min read', category: 'Psychology' },
      'best-boggle-alternatives-2026': { title: 'Best Boggle Alternatives in 2026', excerpt: 'Honest reviews of every Boggle alternative worth playing.', readTime: '10 min read', category: 'Reviews' },
      'word-games-for-brain-training': { title: 'Word Games for Brain Training: The Research', excerpt: 'What 19,000-person studies actually say about brain health.', readTime: '12 min read', category: 'Brain Health' },
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
      categoryTone="lime"
      title={content.title}
      subtitle={content.subtitle}
      date="2026-01-08"
      readTime={content.readTime}
      image={{ src: "/images/blog/word-game-history.jpg", alt: "Historical word game tiles and vintage board games" }}
      ctas={[
        { href: `/${locale}/daily`, label: content.tryDaily },
        { href: `/${locale}/quick-play`, label: content.practice },
      ]}
      after={
        <>
          <AuthorBioCard />
          <RelatedArticles
            currentSlug="word-game-history"
            locale={locale}
            heading={relatedHeading}
            articles={relatedArticlesData}
          />
        </>
      }
    >
      {content.sections.map((section, index) => (
        <div key={`section-${index}`} className="mb-6">
          {section.title && (
            <h2 className="text-xl font-bold mb-3 mt-8 text-neo-black">
              {section.title}
            </h2>
          )}
          {section.content.split('\n\n').map((paragraph, pIndex) => (
            <p
              key={`section-${index}-p-${pIndex}`}
              className="mb-4 leading-relaxed"
            >
              {paragraph}
            </p>
          ))}
          {/* Ad: After 4th section */}
          {index === 3 && <InlineBannerAd webZone="content-page" className="my-6" />}
        </div>
      ))}
    </BlogPostLayout>
  );
}
