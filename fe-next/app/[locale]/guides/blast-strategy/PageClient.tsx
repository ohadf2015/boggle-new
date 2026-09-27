'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';
import { InlineBannerAd } from '@/components/ads';
import { AuthorBioCard } from '@/components/blog/AuthorBioCard';
import { contentByLocale } from './content';

export default function BlastStrategyPageClient(): React.ReactElement {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = (params.locale as string) || language;
  const isDarkMode = theme === 'dark';
  const content = contentByLocale[locale] || contentByLocale.en;

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      isDarkMode ? 'bg-neo-navy' : 'bg-linear-to-br from-neo-cream via-white to-neo-cream'
    )}>
      <AutoHideHeader />

      <article className="max-w-3xl mx-auto px-4 py-8 page-content-safe">
        <Link href={`/${locale}/guides`}>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'mb-6 rounded-neo border-3 border-neo-black shadow-hard',
              isDarkMode ? 'bg-neo-navy-light text-white hover:bg-neo-navy-elevated' : 'bg-white text-neo-black hover:bg-neo-cream'
            )}
          >
            <ArrowLeft className="w-4 h-4 me-1 rtl:rotate-180" />
            {content.backToGuides}
          </Button>
        </Link>

        <header className="mb-8">
          <div className="mb-4">
            <span className={cn(
              'inline-block px-3 py-1 text-xs font-bold uppercase rounded-neo border-2 border-neo-black',
              'bg-neo-orange text-neo-black'
            )}>
              {content.category}
            </span>
          </div>

          <h1 className={cn(
            'text-3xl md:text-4xl font-black mb-4 leading-tight',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            {content.title}
          </h1>

          <p className={cn('text-lg mb-6', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            {content.subtitle}
          </p>

          <div className={cn(
            'flex flex-wrap items-center gap-4 text-sm mb-6',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}>
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              Ohad Fisher
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {content.readTime}
            </span>
          </div>
        </header>

        {/* Quick Tips */}
        <section
          data-speakable="true"
          className={cn(
            'mb-8 p-6 rounded-neo border-3 border-neo-black shadow-hard',
            isDarkMode ? 'bg-neo-navy-light' : 'bg-neo-orange/20'
          )}
        >
          <h2 className={cn('text-xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
            Quick Tips
          </h2>
          <ol className="list-decimal list-inside space-y-2">
            {content.quickTips.map((tip, i) => (
              <li key={`tip-${i}-${tip}`} className={cn('leading-relaxed', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                {tip}
              </li>
            ))}
          </ol>
        </section>

        <InlineBannerAd webZone="content-page" className="my-6" />

        {/* Combo Multiplier Table */}
        <section className="mb-8">
          <h2 className={cn('text-xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
            Combo Multiplier Table
          </h2>
          <div className={cn(
            'overflow-hidden rounded-neo border-3 border-neo-black shadow-hard',
            isDarkMode ? 'bg-neo-navy-light' : 'bg-white'
          )}>
            <table className="w-full text-center">
              <thead>
                <tr className={cn('border-b-3 border-neo-black', isDarkMode ? 'bg-neo-navy-elevated' : 'bg-neo-orange')}>
                  <th className="py-3 px-4 font-bold">Level</th>
                  <th className="py-3 px-4 font-bold">Multiplier</th>
                  <th className="py-3 px-4 font-bold">Window</th>
                </tr>
              </thead>
              <tbody>
                {content.comboTable.map((row, i) => (
                  <tr key={`row-${row.level}`} className={cn(
                    i % 2 === 0
                      ? (isDarkMode ? 'bg-neo-navy-light' : 'bg-white')
                      : (isDarkMode ? 'bg-neo-navy-elevated/50' : 'bg-neo-cream/50')
                  )}>
                    <td className={cn('py-2 px-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                      {row.level}
                    </td>
                    <td className={cn('py-2 px-4 font-bold', isDarkMode ? 'text-neo-orange' : 'text-neo-black')}>
                      {row.multiplier}
                    </td>
                    <td className={cn('py-2 px-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                      {row.window}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Article Content */}
        <div className={cn('prose prose-lg max-w-none', isDarkMode ? 'prose-invert' : '')}>
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
                  className={cn('mb-4 leading-relaxed', isDarkMode ? 'text-gray-300' : 'text-gray-700')}
                >
                  {paragraph}
                </p>
              ))}
              {index === 2 && <InlineBannerAd webZone="content-page" className="my-6" />}
            </div>
          ))}

          {/* FAQ */}
          <section className="mt-10" data-speakable="true">
            <h2 className={cn('text-xl font-bold mb-6', isDarkMode ? 'text-white' : 'text-neo-black')}>
              People Also Ask
            </h2>
            <div className="space-y-4">
              {content.faq.map((item, i) => (
                <details
                  key={`faq-${i}-${item.question}`}
                  className={cn(
                    'rounded-neo border-3 border-neo-black shadow-hard overflow-hidden',
                    isDarkMode ? 'bg-neo-navy-light' : 'bg-white'
                  )}
                >
                  <summary className={cn(
                    'p-4 font-bold cursor-pointer',
                    isDarkMode ? 'text-white hover:bg-neo-navy-elevated' : 'text-neo-black hover:bg-neo-cream'
                  )}>
                    {item.question}
                  </summary>
                  <p className={cn('px-4 pb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          <AuthorBioCard />

          <InlineBannerAd webZone="content-page" className="my-6" />

          {/* CTA */}
          <div className={cn('mt-12 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <Link href={`/${locale}${content.ctaLink}`}>
              <Button className="rounded-neo border-3 border-neo-black bg-neo-orange text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                {content.ctaText}
              </Button>
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
