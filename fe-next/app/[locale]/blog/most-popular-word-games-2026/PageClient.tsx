'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { safeToLocaleDateString } from '@/utils/bcp47Locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';
import { InlineBannerAd } from '@/components/ads';
import { contentByLocale } from './content';
import { faqByLocale, faqHeadingByLocale } from './faq';
import { AuthorBioCard } from '@/components/blog/AuthorBioCard';

export default function MostPopularWordGamesPageClient(): React.ReactElement {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = (params.locale as string) || language;
  const isDarkMode = theme === 'dark';

  const content = contentByLocale[locale] || contentByLocale.en;
  const faqs = faqByLocale[locale] || faqByLocale.en;
  const faqHeading = faqHeadingByLocale[locale] || faqHeadingByLocale.en;
  const heroSection = content.sections[0];
  const restSections = content.sections.slice(1);

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      isDarkMode
        ? 'bg-neo-navy'
        : 'bg-linear-to-br from-neo-cream via-white to-neo-cream'
    )}>
      <AutoHideHeader />

      <article className="max-w-3xl mx-auto px-4 py-8 page-content-safe">
        <Link href={`/${locale}/blog`}>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'mb-6 rounded-neo border-3 border-neo-black shadow-hard',
              isDarkMode ? 'bg-neo-navy-light text-white hover:bg-neo-navy-elevated' : 'bg-white text-neo-black hover:bg-neo-cream'
            )}
          >
            <ArrowLeft className="w-4 h-4 me-1 rtl:rotate-180" />
            {content.backToBlog}
          </Button>
        </Link>

        <header className="mb-8">
          <div className="mb-4">
            <span className={cn(
              'inline-block px-3 py-1 text-xs font-bold uppercase rounded-neo border-2 border-neo-black',
              'bg-neo-cyan text-neo-black'
            )}>
              {content.category}
            </span>
          </div>

          <h1 className={cn(
            'text-3xl md:text-4xl font-black mb-3 leading-tight',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            {content.title}
          </h1>

          <p className={cn(
            'text-lg mb-4 leading-relaxed',
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          )}>
            {content.subtitle}
          </p>

          <div className={cn(
            'flex flex-wrap items-center gap-4 text-sm mb-6',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {safeToLocaleDateString(new Date('2026-05-15'), language, { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {content.readTime}
            </span>
          </div>

          {heroSection?.image && (
            <div className="relative w-full h-64 md:h-80 rounded-neo border-3 border-neo-black overflow-hidden shadow-hard mb-6">
              <Image
                src={heroSection.image.src}
                alt={heroSection.image.alt}
                fill
              sizes="(min-width: 768px) 736px, calc(100vw - 2rem)"
                className="object-cover"
                priority
              />
            </div>
          )}
        </header>

        <InlineBannerAd webZone="content-page" className="my-6" />

        <div className={cn(
          'prose prose-lg max-w-none',
          isDarkMode ? 'prose-invert' : ''
        )}>
          {/* Hero intro paragraphs */}
          {heroSection?.content.split('\n\n').map((paragraph, pIndex) => (
            <p
              key={`hero-p-${pIndex}`}
              className={cn(
                'mb-4 leading-relaxed',
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              )}
            >
              {paragraph}
            </p>
          ))}

          {restSections.map((section, index) => (
            <div key={`section-${index}`} className="mb-6">
              {section.title && (
                <h2 className={cn(
                  'text-xl font-bold mb-3 mt-8',
                  isDarkMode ? 'text-white' : 'text-neo-black'
                )}>
                  {section.title}
                </h2>
              )}

              {section.content.split('\n\n').map((paragraph, pIndex) => (
                <p
                  key={`section-${index}-p-${pIndex}`}
                  className={cn(
                    'mb-4 leading-relaxed',
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  )}
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
              className={cn(
                'text-2xl font-black mb-4',
                isDarkMode ? 'text-white' : 'text-neo-black'
              )}
            >
              {faqHeading}
            </h2>
            <div className="flex flex-col gap-4">
              {faqs.map((faq, i) => (
                <div
                  key={`faq-${i}`}
                  className={cn(
                    'rounded-neo border-3 border-neo-black p-4 shadow-hard',
                    isDarkMode ? 'bg-neo-navy-light' : 'bg-white'
                  )}
                >
                  <h3 className={cn(
                    'font-bold mb-2',
                    isDarkMode ? 'text-neo-cyan' : 'text-neo-black'
                  )}>
                    {faq.question}
                  </h3>
                  <p
                    data-speakable="true"
                    className={cn(
                      'leading-relaxed',
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    )}
                  >
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <AuthorBioCard />

          <InlineBannerAd webZone="content-page" className="my-6" />

          <div className={cn('mt-12 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <div className="flex flex-wrap gap-4">
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-yellow text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {content.tryDaily}
                </Button>
              </Link>
              <Link href={`/${locale}/singleplayer`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-orange text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {content.practice}
                </Button>
              </Link>
              <Link
                href={
                  locale === 'es'
                    ? '/es/juego-de-palabras-multijugador'
                    : locale === 'sv'
                      ? '/sv/swedish-multiplayer-word-game'
                      : locale === 'he'
                        ? '/he/hebrew-multiplayer-word-game'
                        : locale === 'ja'
                          ? '/ja/japanese-word-game'
                          : '/en/multiplayer-word-game-online'
                }
              >
                <Button className="rounded-neo border-3 border-neo-black bg-neo-pink text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {content.playMultiplayer}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
