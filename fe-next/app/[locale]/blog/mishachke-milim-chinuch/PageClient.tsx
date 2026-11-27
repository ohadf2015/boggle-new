'use client';

import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { RelatedArticles } from '@/components/blog/RelatedArticles';
import { contentByLocale } from './content';
import { AuthorBioCard } from '@/components/blog/AuthorBioCard';
import { BlogPostLayout, BlogSections } from '@/components/blog/BlogPostLayout';

export default function MishachkeMilimChinuchPageClient(): React.ReactElement {
  const { language } = useLanguage();
  const params = useParams();
  const locale = (params.locale as string) || language;

  const content = contentByLocale[locale] || contentByLocale.he;
  const relatedHeadingByLocale: Record<string, string> = {
    en: 'You Might Also Like',
    he: 'אולי יעניין אותך גם',
    sv: 'Du kanske också gillar',
    ja: 'こちらもおすすめ',
    es: 'También te puede interesar',
  };
  const relatedHeading = relatedHeadingByLocale[locale] || relatedHeadingByLocale.he;
  const relatedArticlesData = [
    { slug: 'milat-hayom-habit', title: 'מילת היום: ההרגל היומי', excerpt: '', readTime: '9 דקות', category: 'הרגלים', image: '' },
    { slug: 'hebrew-word-games-guide', title: 'מדריך משחקי מילים בעברית', excerpt: '', readTime: '10 min read', category: 'מדריך', image: '' },
    { slug: 'word-games-for-kids-education', title: 'Word Games for Kids and Education', excerpt: '', readTime: '7 min read', category: 'Education', image: '' },
    { slug: 'word-games-for-brain-training', title: 'Word Games for Brain Training: The Research', excerpt: '', readTime: '12 min read', category: 'Brain Health', image: '' },
    { slug: 'multilingual-word-learning', title: 'Multilingual Word Learning Through Games', excerpt: '', readTime: '8 min read', category: 'Language', image: '' },
    { slug: 'vocabulary-building-strategies', title: 'Vocabulary Building Strategies', excerpt: '', readTime: '8 min read', category: 'Learning', image: '' },
    { slug: 'science-behind-word-games', title: 'The Science Behind Word Games', excerpt: '', readTime: '6 min read', category: 'Science', image: '' },
    { slug: '10-surprising-benefits-word-games', title: '10 Surprising Benefits of Playing Word Games Daily', excerpt: '', readTime: '5 min read', category: 'Research', image: '' },
    { slug: 'why-word-games-are-addictive', title: 'Why You Can\'t Stop Playing Word Games', excerpt: '', readTime: '11 min read', category: 'Psychology', image: '' },
  ];

  return (
    <BlogPostLayout
      locale={locale}
      backLabel={content.backToBlog}
      category={content.category}
      categoryTone="purple"
      title={content.title}
      subtitle={content.subtitle}
      date="2026-05-11"
      readTime={content.readTime}
      image={{ src: "/images/blog/mishachke-milim-chinuch.jpg", alt: "כיתה ישראלית עם תלמידים שמסתכלים על לוח חכם עם משחק מילים בעברית" }}
      ctas={[
        { href: `/${locale}/daily`, label: content.playDaily },
        { href: `/${locale}/blog/hebrew-word-games-guide`, label: content.startPracticing },
      ]}
      after={
        <>
          <AuthorBioCard />
          <RelatedArticles
            currentSlug="mishachke-milim-chinuch"
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
