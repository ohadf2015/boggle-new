'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { safeLocaleCompare } from '@/utils/bcp47Locale';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';
import { InlineBannerAd } from '@/components/ads';
import { contentByLocale } from './content';

export default function GlossaryPageClient(): React.ReactElement {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = (params.locale as string) || language;
  const isDarkMode = theme === 'dark';
  const content = contentByLocale[locale] || contentByLocale.en;

  const sortedTerms = useMemo(() =>
    [...content.terms].sort((a, b) => safeLocaleCompare(a.term, b.term, locale)),
    [content.terms, locale]
  );

  const letters = useMemo(() => {
    const set = new Set(sortedTerms.map(t => t.term.charAt(0).toUpperCase()));
    return Array.from(set).sort((a, b) => safeLocaleCompare(a, b, locale));
  }, [sortedTerms, locale]);

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      isDarkMode ? 'bg-neo-navy' : 'bg-linear-to-br from-neo-cream via-white to-neo-cream'
    )}>
      <AutoHideHeader />

      <main className="max-w-3xl mx-auto px-4 py-8 page-content-safe">
        <Link href={`/${locale}`}>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'mb-6 rounded-neo border-3 border-neo-black shadow-hard',
              isDarkMode ? 'bg-neo-navy-light text-white hover:bg-neo-navy-elevated' : 'bg-white text-neo-black hover:bg-neo-cream'
            )}
          >
            <ArrowLeft className="w-4 h-4 me-1 rtl:rotate-180" />
            Home
          </Button>
        </Link>

        <header className="mb-8 text-center">
          <h1 className={cn(
            'text-3xl md:text-4xl font-black mb-4',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            {content.title}
          </h1>
          <p className={cn('text-lg', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            {content.subtitle}
          </p>
        </header>

        {/* A-Z Navigation */}
        <nav
          className={cn(
            'mb-8 p-4 rounded-neo border-3 border-neo-black shadow-hard flex flex-wrap gap-2 justify-center',
            isDarkMode ? 'bg-neo-navy-light' : 'bg-white'
          )}
          aria-label="Alphabetical navigation"
        >
          {letters.map(letter => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded font-bold text-sm',
                'border-2 border-neo-black transition-colors',
                isDarkMode
                  ? 'bg-neo-navy-elevated text-white hover:bg-neo-yellow hover:text-neo-black'
                  : 'bg-neo-cream text-neo-black hover:bg-neo-yellow'
              )}
            >
              {letter}
            </a>
          ))}
        </nav>

        <InlineBannerAd webZone="content-page" className="my-6" />

        {/* Glossary Terms as Definition List */}
        <div data-speakable="true">
          {letters.map((letter, li) => {
            const termsForLetter = sortedTerms.filter(
              t => t.term.charAt(0).toUpperCase() === letter
            );
            return (
              <section key={letter} id={`letter-${letter}`} className="mb-8">
                <h2 className={cn(
                  'text-2xl font-black mb-4 pb-2 border-b-3 border-neo-black',
                  isDarkMode ? 'text-neo-yellow' : 'text-neo-black'
                )}>
                  {letter}
                </h2>
                <dl className="space-y-4">
                  {termsForLetter.map(item => (
                    <div
                      key={item.term}
                      className={cn(
                        'p-4 rounded-neo border-3 border-neo-black shadow-hard',
                        isDarkMode ? 'bg-neo-navy-light' : 'bg-white'
                      )}
                    >
                      <dt className={cn(
                        'text-lg font-bold mb-1',
                        isDarkMode ? 'text-white' : 'text-neo-black'
                      )}>
                        {item.term}
                      </dt>
                      <dd className={cn(
                        'leading-relaxed',
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      )}>
                        {item.definition}
                      </dd>
                      {item.related && item.related.length > 0 && (
                        <dd className={cn(
                          'mt-2 text-xs',
                          isDarkMode ? 'text-gray-500' : 'text-gray-500'
                        )}>
                          Related: {item.related.join(', ')}
                        </dd>
                      )}
                    </div>
                  ))}
                </dl>
                {li === 2 && <InlineBannerAd webZone="content-page" className="mt-6" />}
              </section>
            );
          })}
        </div>

        <InlineBannerAd webZone="content-page" className="my-6" />
      </main>
    </div>
  );
}
