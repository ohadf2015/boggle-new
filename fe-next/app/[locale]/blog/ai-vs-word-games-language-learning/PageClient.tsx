'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';
import { InlineBannerAd } from '@/components/ads';
import { contentByLocale } from './content';

export default function AiVsWordGamesPageClient(): React.ReactElement {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = (params.locale as string) || language;
  const isDarkMode = theme === 'dark';

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
    <div className={cn(
      'min-h-screen flex flex-col',
      isDarkMode ? 'bg-neo-navy' : 'bg-linear-to-br from-neo-cream via-white to-neo-cream'
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
            'flex items-center gap-4 text-sm mb-6',
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          )}>
            <span className="font-medium">{content.authorName}</span>
            <span>·</span>
            <span>{content.readTime}</span>
          </div>

          {/* Hero Image */}
          <div className="relative w-full h-64 md:h-80 rounded-neo border-3 border-neo-black overflow-hidden shadow-hard mb-6">
            <Image
              src="/images/blog/multilingual.jpg"
              alt="AI language apps versus word games comparison"
              fill
              className="object-cover"
              priority
            />
          </div>
        </header>

        {/* Ad: After header */}
        <InlineBannerAd webZone="content-page" className="my-6" />

        <div className={cn(
          'prose prose-lg max-w-none',
          isDarkMode ? 'prose-invert' : ''
        )}>
          {content.sections.map((section, index) => (
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
              {index === 3 && <InlineBannerAd webZone="content-page" className="my-6" />}
            </div>
          ))}

          {/* Author bio */}
          <div className={cn(
            'mt-10 p-4 rounded-neo border-3 border-neo-black shadow-hard',
            isDarkMode ? 'bg-neo-navy-light' : 'bg-neo-cream'
          )}>
            <p className={cn('text-sm font-bold mb-1', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {content.authorName}
            </p>
            <p className={cn('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              {content.authorBio}
            </p>
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link href={`/${locale}/daily`} className="flex-1">
              <Button className="w-full bg-neo-lime text-neo-black font-black rounded-neo border-3 border-neo-black shadow-hard hover:shadow-hard-pressed hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                {cta.daily}
              </Button>
            </Link>
            <Link href={`/${locale}/education`} className="flex-1">
              <Button variant="outline" className={cn(
                'w-full font-black rounded-neo border-3 border-neo-black shadow-hard hover:shadow-hard-pressed hover:translate-x-[2px] hover:translate-y-[2px] transition-all',
                isDarkMode ? 'bg-neo-navy-light text-white' : 'bg-white text-neo-black'
              )}>
                {cta.edu}
              </Button>
            </Link>
          </div>

          <InlineBannerAd webZone="content-page" className="mt-8" />
        </div>
      </article>
    </div>
  );
}
