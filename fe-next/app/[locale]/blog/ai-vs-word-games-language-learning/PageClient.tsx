'use client';

import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { InlineBannerAd } from '@/components/ads';
import { BlogPostLayout } from '@/components/blog/BlogPostLayout';
import { contentByLocale } from './content';

export default function AiVsWordGamesPageClient(): React.ReactElement {
  const { language } = useLanguage();
  const params = useParams();
  const locale = (params.locale as string) || language;

  const content = contentByLocale[locale] || contentByLocale.en;

  const ctaByLocale: Record<string, { daily: string; edu: string }> = {
    en: { daily: 'Try the Daily Challenge', edu: 'Explore Language Learning' },
    he: { daily: 'נסה את האתגר היומי', edu: 'גלה לימוד שפות' },
    sv: { daily: 'Prova den dagliga utmaningen', edu: 'Utforska språkinlärning' },
    ja: { daily: 'デイリーチャレンジを試す', edu: '語学学習を探索' },
    es: { daily: 'Prueba el desafío diario', edu: 'Explorar aprendizaje de idiomas' },
  };
  const cta = ctaByLocale[locale] || ctaByLocale.en;

  return (
    <BlogPostLayout
      locale={locale}
      backLabel={content.backToBlog}
      category={content.category}
      title={content.title}
      subtitle={content.subtitle}
      byline={content.authorName}
      readTime={content.readTime}
      image={{ src: "/images/blog/multilingual.jpg", alt: "AI language apps versus word games comparison" }}
      ctas={[
        { href: `/${locale}/daily`, label: cta.daily },
        { href: `/${locale}/education`, label: cta.edu },
      ]}
      after={
        <aside className="rounded-neo-lg border-3 border-neo-black bg-neo-cream p-5 text-neo-black shadow-hard-xl">
          <p className="mb-1 text-sm font-bold">{content.authorName}</p>
          <p className="text-sm leading-relaxed">{content.authorBio}</p>
        </aside>
      }
    >
      {content.sections.map((section, index) => (
        <div key={`section-${index}`} className="space-y-4">
          {section.title && <h2>{section.title}</h2>}
          {section.content.split('\n\n').map((paragraph, pIndex) => (
            <p key={`section-${index}-p-${pIndex}`}>{paragraph}</p>
          ))}
          {index === 3 && <InlineBannerAd webZone="content-page" className="my-6" />}
        </div>
      ))}
    </BlogPostLayout>
  );
}
