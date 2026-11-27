'use client';

import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { InlineBannerAd } from '@/components/ads';
import { BlogPostLayout } from '@/components/blog/BlogPostLayout';
import { contentByLocale } from './content';

export default function SpellingBeeSciencePageClient(): React.ReactElement {
  const { language } = useLanguage();
  const params = useParams();
  const locale = (params.locale as string) || language;

  const content = contentByLocale[locale] || contentByLocale.en;

  const ctaByLocale: Record<string, { daily: string; edu: string }> = {
    en: { daily: 'Try the Daily Challenge', edu: 'Spelling Practice for Students' },
    he: { daily: 'נסה את האתגר היומי', edu: 'תרגול איות לתלמידים' },
    sv: { daily: 'Prova den dagliga utmaningen', edu: 'Stavningsövning för elever' },
    ja: { daily: 'デイリーチャレンジを試す', edu: '生徒向けスペリング練習' },
    es: { daily: 'Prueba el Desafío Diario', edu: 'Práctica de Ortografía para Estudiantes' },
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
      image={{ src: "/images/blog/brain-health.jpg", alt: "Spelling bee competition and memory science — vocabulary learning research" }}
      ctas={[
        { href: `/${locale}/daily`, label: cta.daily },
        { href: `/${locale}/education/spelling-bee-practice`, label: cta.edu },
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
          {index === 2 && <InlineBannerAd webZone="content-page" className="my-6" />}
        </div>
      ))}
    </BlogPostLayout>
  );
}
