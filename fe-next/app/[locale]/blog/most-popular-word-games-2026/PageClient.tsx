'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { contentByLocale } from './content';
import { faqByLocale, faqHeadingByLocale } from './faq';
import { AuthorBioCard } from '@/components/blog/AuthorBioCard';
import { BlogPostLayout } from '@/components/blog/BlogPostLayout';

export default function MostPopularWordGamesPageClient(): React.ReactElement {
  const { language } = useLanguage();
  const params = useParams();
  const locale = (params.locale as string) || language;

  const content = contentByLocale[locale] || contentByLocale.en;
  const faqs = faqByLocale[locale] || faqByLocale.en;
  const faqHeading = faqHeadingByLocale[locale] || faqHeadingByLocale.en;
  const heroSection = content.sections[0];
  const restSections = content.sections.slice(1);

  return (
    <BlogPostLayout
      locale={locale}
      backLabel={content.backToBlog}
      category={content.category}
      categoryTone="cyan"
      title={content.title}
      subtitle={content.subtitle}
      date="2026-05-15"
      readTime={content.readTime}
      image={heroSection?.image}
      ctas={[
        { href: `/${locale}/daily`, label: content.tryDaily },
        { href: `/${locale}/quick-play`, label: content.practice },
        { href: 
                  locale === 'es'
                    ? '/es/juego-de-palabras-multijugador'
                    : locale === 'sv'
                      ? '/sv/swedish-multiplayer-word-game'
                      : locale === 'he'
                        ? '/he/hebrew-multiplayer-word-game'
                        : locale === 'ja'
                          ? '/ja/japanese-word-game'
                          : '/en/free-multiplayer-word-game'
                , label: content.playMultiplayer },
      ]}
      after={
        <>
          <AuthorBioCard />
        </>
      }
    >
      {/* Hero intro paragraphs */}
      {heroSection?.content.split('\n\n').map((paragraph, pIndex) => (
        <p
          key={`hero-p-${pIndex}`}
          className="mb-4 leading-relaxed"
        >
          {paragraph}
        </p>
      ))}

      {restSections.map((section, index) => (
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

          {section.image && (
            <div className="relative w-full h-56 md:h-72 rounded-neo border-3 border-neo-black overflow-hidden shadow-hard my-6">
              <Image
                src={section.image.src}
                alt={section.image.alt}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          )}
        </div>
      ))}

      {/* FAQ section — visible Q&A backs the FAQPage JSON-LD for AI citation */}
      <section className="mt-12" aria-labelledby="faq-heading">
        <h2
          id="faq-heading"
          className="text-2xl font-black mb-4 text-neo-black"
        >
          {faqHeading}
        </h2>
        <div className="flex flex-col gap-4">
          {faqs.map((faq, i) => (
            <div
              key={`faq-${i}`}
              className="rounded-neo border-3 border-neo-black p-4 shadow-hard bg-neo-white"
            >
              <h3 className="font-bold mb-2 text-neo-black">
                {faq.question}
              </h3>
              <p
                data-speakable="true"
                className="leading-relaxed"
              >
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </section>
    </BlogPostLayout>
  );
}
