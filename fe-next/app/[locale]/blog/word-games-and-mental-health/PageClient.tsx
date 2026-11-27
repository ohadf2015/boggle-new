'use client';

import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { RelatedArticles } from '@/components/blog/RelatedArticles';
import { contentByLocale } from './content';
import { AuthorBioCard } from '@/components/blog/AuthorBioCard';
import { BlogPostLayout, BlogSections } from '@/components/blog/BlogPostLayout';

export default function MentalHealthPageClient(): React.ReactElement {
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
      'science-behind-word-games': { title: 'The Science Behind Word Games and Brain Health', excerpt: 'Explore the cognitive benefits backed by neuroscience.', readTime: '9 min read', category: 'Science' },
      'why-word-games-are-addictive': { title: 'Why You Can\'t Stop Playing Word Games', excerpt: 'Dopamine, flow states, and the psychology of "one more round."', readTime: '11 min read', category: 'Psychology' },
      'word-games-for-brain-training': { title: 'Word Games for Brain Training: The Research', excerpt: 'What 19,000-person studies actually say about brain health.', readTime: '12 min read', category: 'Brain Health' },
      'daily-challenge-strategies': { title: '7 Proven Daily Challenge Strategies', excerpt: 'Master expert tactics to maximize your score.', readTime: '7 min read', category: 'Strategy' },
      'multilingual-word-learning': { title: 'Multilingual Word Learning Through Games', excerpt: 'How playing in multiple languages supercharges your brain.', readTime: '8 min read', category: 'Language' },
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
      categoryTone="lime"
      title={content.title}
      subtitle={content.subtitle}
      date="2025-10-05"
      readTime={content.readTime}
      image={{ src: "/images/blog/mental-health.jpg", alt: "Person relaxing while playing a word game on their phone" }}
      ctas={[
        { href: `/${locale}/daily`, label: content.tryDaily },
        { href: `/${locale}/quick-play`, label: content.practice },
      ]}
      after={
        <>
          <AuthorBioCard />
          <RelatedArticles
            currentSlug="word-games-and-mental-health"
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
