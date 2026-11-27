'use client';

import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { InlineBannerAd } from '@/components/ads';
import { AuthorBioCard } from '@/components/blog/AuthorBioCard';
import { BlogPostLayout } from '@/components/blog/BlogPostLayout';
import { CompareTable, FaqList, Section } from '@/components/landing/kit';
import { contentByLocale } from './content';

export default function BlastStrategyPageClient(): React.ReactElement {
  const { language } = useLanguage();
  const params = useParams();
  const locale = (params.locale as string) || language;
  const content = contentByLocale[locale] || contentByLocale.en;

  return (
    <BlogPostLayout
      locale={locale}
      backHref={`/${locale}/guides`}
      backLabel={content.backToGuides}
      category={content.category}
      categoryTone="orange"
      title={content.title}
      subtitle={content.subtitle}
      byline="Ohad Fisher"
      readTime={content.readTime}
      ctas={[{ href: `/${locale}${content.ctaLink}`, label: content.ctaText }]}
      intro={
        <>
          <section data-speakable="true" className="rounded-neo-lg border-3 border-neo-black bg-neo-orange p-5 text-neo-black shadow-hard-xl sm:p-7">
            <h2 className="mb-3 font-neo-display text-xl font-bold">Quick Tips</h2>
            <ol className="list-decimal space-y-2 ps-5">
              {content.quickTips.map((tip, i) => (
                <li key={`tip-${i}-${tip}`} className="leading-relaxed">
                  {tip}
                </li>
              ))}
            </ol>
          </section>
          <Section title="Combo Multiplier Table">
            <CompareTable
              columns={['Level', 'Multiplier', 'Window']}
              rows={content.comboTable.map((row) => [row.level, row.multiplier, row.window])}
            />
          </Section>
        </>
      }
      after={
        <>
          <div data-speakable="true">
            <Section title="People Also Ask">
              <FaqList items={content.faq.map((item) => ({ q: item.question, a: item.answer }))} />
            </Section>
          </div>
          <AuthorBioCard />
        </>
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
