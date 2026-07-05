'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, ChevronDown, ChevronUp, HelpCircle, BookOpen } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';
import { InlineBannerAd } from "@/components/ads";
import { contentByLocale, type FAQContent } from './content';

export default function FAQPageClient(): React.ReactElement {
  const { theme } = useTheme();
  const params = useParams();
  const locale = params.locale as string;
  const c: FAQContent = contentByLocale[locale] || contentByLocale.en;
  const isDarkMode = theme === 'dark';

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const categoryOrder = ['gettingStarted', 'gameplay', 'technical', 'account', 'privacy'] as const;

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      isDarkMode
        ? 'bg-neo-navy'
        : 'bg-linear-to-br from-neo-cream via-white to-neo-cream'
    )}>
      <AutoHideHeader />

      <div className="max-w-4xl mx-auto px-4 py-8 page-content-safe">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/${locale}`}>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'rounded-neo border-3 border-neo-black shadow-hard',
                isDarkMode ? 'bg-neo-navy-light text-white hover:bg-neo-navy-elevated' : 'bg-white text-neo-black hover:bg-neo-cream'
              )}
            >
              <DirectionalIcon icon={ArrowLeft} className="w-4 h-4 me-1" />
              {c.back}
            </Button>
          </Link>
          <div>
            <h1 className={cn(
              'text-4xl font-black uppercase flex items-center gap-3',
              isDarkMode ? 'text-white' : 'text-neo-black'
            )}>
              <HelpCircle className="w-8 h-8 text-neo-lime" />
              {c.title}
            </h1>
            <p className={cn('text-sm mt-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              {c.subtitle}
            </p>
          </div>
        </div>

        {/* FAQ by Category */}
        {categoryOrder.map((catKey, catIdx) => {
          const categoryItems = c.items.filter(item => item.category === catKey);
          if (categoryItems.length === 0) return null;

          return (
            <div key={catKey} className="mb-8">
              {catIdx === 2 && <InlineBannerAd webZone="content-page" className="mb-8" />}
              <h2 className={cn(
                'text-2xl font-bold mb-4',
                isDarkMode ? 'text-white' : 'text-neo-black'
              )}>
                {c.categories[catKey]}
              </h2>
              <div className="space-y-3">
                {categoryItems.map((item) => {
                  const globalIndex = c.items.indexOf(item);
                  const isOpen = openIndex === globalIndex;

                  return (
                    <div
                      key={globalIndex}
                      className={cn(
                        'rounded-neo border-3 border-neo-black transition-all',
                        isDarkMode
                          ? 'bg-neo-navy-light'
                          : 'bg-white shadow-hard',
                        isOpen && 'shadow-hard-lg'
                      )}
                    >
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                        className="w-full flex items-center justify-between p-4 text-start"
                        aria-expanded={isOpen}
                      >
                        <span className={cn(
                          'font-bold text-lg pe-4',
                          isDarkMode ? 'text-white' : 'text-neo-black'
                        )}>
                          {item.question}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 shrink-0 text-neo-lime" />
                        ) : (
                          <ChevronDown className="w-5 h-5 shrink-0 text-gray-500" />
                        )}
                      </button>
                      {/* Always render answer in DOM for SEO — use CSS to toggle visibility */}
                      <div
                        className={cn(
                          'overflow-hidden transition-all duration-300',
                          isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
                        )}
                      >
                        <div className={cn(
                          'px-4 pb-4 pt-0',
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        )}>
                          {item.answer}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Contact CTA */}
        <div className={cn(
          'mt-12 p-6 rounded-neo border-3 border-neo-black text-center',
          isDarkMode ? 'bg-neo-navy-light' : 'bg-neo-lime/20'
        )}>
          <h3 className={cn('text-xl font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
            {c.stillHaveQuestions}
          </h3>
          <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            {c.hereToHelp}
          </p>
          <Link href={`/${locale}/contact`}>
            <Button className="rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
              {c.contactUs}
            </Button>
          </Link>
        </div>

        {/* Blog CTA */}
        <div className={cn(
          'mt-6 p-6 rounded-neo border-3 border-neo-black',
          isDarkMode ? 'bg-neo-navy-light' : 'bg-neo-cyan/10'
        )}>
          <div className="flex items-center gap-3 mb-3">
            <BookOpen className={cn('w-6 h-6', 'text-neo-cyan')} />
            <h3 className={cn('text-lg font-bold', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {c.learnMore}
            </h3>
          </div>
          <p className={cn('text-sm mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            {c.blogCta}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/${locale}/blog/science-behind-word-games`}>
              <Button variant="outline" size="sm" className="rounded-neo border-2 border-neo-black font-bold text-xs">
                {c.blogScienceTitle}
              </Button>
            </Link>
            <Link href={`/${locale}/blog/daily-challenge-strategies`}>
              <Button variant="outline" size="sm" className="rounded-neo border-2 border-neo-black font-bold text-xs">
                {c.blogStrategiesTitle}
              </Button>
            </Link>
            <Link href={`/${locale}/blog`}>
              <Button size="sm" className="rounded-neo border-2 border-neo-black bg-neo-cyan text-neo-black font-bold text-xs shadow-hard-sm">
                {c.blogViewAll}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
