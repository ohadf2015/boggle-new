'use client';

import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { contentByLocale } from './content';
import { AuthorBioCard } from '@/components/blog/AuthorBioCard';
import { BlogPostLayout, BlogSections } from '@/components/blog/BlogPostLayout';

export default function BrainTrainingPageClient(): React.ReactElement {
  const { language } = useLanguage();
  const params = useParams();
  const locale = (params.locale as string) || language;

  const content = contentByLocale[locale] || contentByLocale.en;

  return (
    <BlogPostLayout
      locale={locale}
      backLabel={content.backToBlog}
      category={content.category}
      categoryTone="cyan"
      title={content.title}
      subtitle={content.subtitle}
      date="2025-12-20"
      readTime={content.readTime}
      image={{ src: "/images/blog/brain-training-words.jpg", alt: "Word games and brain training research visualization" }}
      ctas={[
        { href: `/${locale}/daily`, label: content.tryDaily },
        { href: `/${locale}/quick-play`, label: content.practice },
      ]}
      after={
        <>
          <AuthorBioCard />
        </>
      }
    >
      <BlogSections sections={content.sections} />
    </BlogPostLayout>
  );
}
