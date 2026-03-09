'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, ChevronDown, ChevronUp, HelpCircle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';
import { AdPlaceholder } from '@/components/ads';

interface FAQItem {
  questionKey: string;
  answerKey: string;
  categoryKey: string;
}

const faqData: FAQItem[] = [
  { categoryKey: 'faq.categories.gettingStarted', questionKey: 'faq.q.whatIs', answerKey: 'faq.a.whatIs' },
  { categoryKey: 'faq.categories.gettingStarted', questionKey: 'faq.q.createAccount', answerKey: 'faq.a.createAccount' },
  { categoryKey: 'faq.categories.gettingStarted', questionKey: 'faq.q.isFree', answerKey: 'faq.a.isFree' },
  { categoryKey: 'faq.categories.gameplay', questionKey: 'faq.q.scoring', answerKey: 'faq.a.scoring' },
  { categoryKey: 'faq.categories.gameplay', questionKey: 'faq.q.gameModes', answerKey: 'faq.a.gameModes' },
  { categoryKey: 'faq.categories.gameplay', questionKey: 'faq.q.dailyChallenge', answerKey: 'faq.a.dailyChallenge' },
  { categoryKey: 'faq.categories.gameplay', questionKey: 'faq.q.multipleLanguages', answerKey: 'faq.a.multipleLanguages' },
  { categoryKey: 'faq.categories.technical', questionKey: 'faq.q.devices', answerKey: 'faq.a.devices' },
  { categoryKey: 'faq.categories.technical', questionKey: 'faq.q.internet', answerKey: 'faq.a.internet' },
  { categoryKey: 'faq.categories.technical', questionKey: 'faq.q.reportBug', answerKey: 'faq.a.reportBug' },
  { categoryKey: 'faq.categories.account', questionKey: 'faq.q.changeProfile', answerKey: 'faq.a.changeProfile' },
  { categoryKey: 'faq.categories.account', questionKey: 'faq.q.multipleDevices', answerKey: 'faq.a.multipleDevices' },
  { categoryKey: 'faq.categories.account', questionKey: 'faq.q.deleteAccount', answerKey: 'faq.a.deleteAccount' },
  { categoryKey: 'faq.categories.privacy', questionKey: 'faq.q.dataSafe', answerKey: 'faq.a.dataSafe' },
  { categoryKey: 'faq.categories.privacy', questionKey: 'faq.q.ads', answerKey: 'faq.a.ads' },
  { categoryKey: 'faq.categories.privacy', questionKey: 'faq.q.optOut', answerKey: 'faq.a.optOut' },
];

export default function FAQPageClient(): React.ReactElement {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = params.locale as string;
  const isDarkMode = theme === 'dark';

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const categoryKeys = Array.from(new Set(faqData.map(item => item.categoryKey)));

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      isDarkMode
        ? 'bg-neo-navy'
        : 'bg-gradient-to-br from-neo-cream via-white to-neo-cream'
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
                isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-neo-black hover:bg-neo-cream'
              )}
            >
              <ArrowLeft className="w-4 h-4 me-1 rtl:rotate-180" />
              {t('common.back')}
            </Button>
          </Link>
          <div>
            <h1 className={cn(
              'text-4xl font-black uppercase flex items-center gap-3',
              isDarkMode ? 'text-white' : 'text-neo-black'
            )}>
              <HelpCircle className="w-8 h-8 text-neo-yellow" />
              {t('faq.title')}
            </h1>
            <p className={cn('text-sm mt-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              {t('faq.subtitle')}
            </p>
          </div>
        </div>

        {/* FAQ by Category */}
        {categoryKeys.map((categoryKey, catIdx) => (
          <div key={categoryKey} className="mb-8">
            {/* Ad: Between category sections (after ~8 items) */}
            {catIdx === 2 && <AdPlaceholder zone="content-page" className="mb-8" />}
            <h2 className={cn(
              'text-2xl font-bold mb-4',
              isDarkMode ? 'text-white' : 'text-neo-black'
            )}>
              {t(categoryKey)}
            </h2>
            <div className="space-y-3">
              {faqData
                .filter(item => item.categoryKey === categoryKey)
                .map((item, idx) => {
                  const globalIndex = faqData.indexOf(item);
                  const isOpen = openIndex === globalIndex;

                  return (
                    <div
                      key={idx}
                      className={cn(
                        'rounded-neo border-3 border-neo-black transition-all',
                        isDarkMode
                          ? 'bg-slate-800'
                          : 'bg-white shadow-hard',
                        isOpen && 'shadow-hard-lg'
                      )}
                    >
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                        className="w-full flex items-center justify-between p-4 text-left"
                      >
                        <span className={cn(
                          'font-bold text-lg pe-4',
                          isDarkMode ? 'text-white' : 'text-neo-black'
                        )}>
                          {t(item.questionKey)}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 flex-shrink-0 text-neo-yellow" />
                        ) : (
                          <ChevronDown className="w-5 h-5 flex-shrink-0 text-gray-500" />
                        )}
                      </button>
                      {isOpen && (
                        <div className={cn(
                          'px-4 pb-4 pt-0',
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        )}>
                          {t(item.answerKey)}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}

        {/* Contact CTA */}
        <div className={cn(
          'mt-12 p-6 rounded-neo border-3 border-neo-black text-center',
          isDarkMode ? 'bg-slate-800' : 'bg-neo-yellow/20'
        )}>
          <h3 className={cn('text-xl font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
            {t('faq.stillHaveQuestions')}
          </h3>
          <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            {t('faq.hereToHelp')}
          </p>
          <Link href={`/${locale}/contact`}>
            <Button className="rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
              {t('faq.contactUs')}
            </Button>
          </Link>
        </div>

        {/* Blog CTA */}
        <div className={cn(
          'mt-6 p-6 rounded-neo border-3 border-neo-black',
          isDarkMode ? 'bg-slate-800' : 'bg-neo-cyan/10'
        )}>
          <div className="flex items-center gap-3 mb-3">
            <BookOpen className={cn('w-6 h-6', isDarkMode ? 'text-neo-cyan' : 'text-neo-cyan')} />
            <h3 className={cn('text-lg font-bold', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {t('faq.learnMore') || 'Want to learn more?'}
            </h3>
          </div>
          <p className={cn('text-sm mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            {t('faq.blogCta') || 'Check out our blog for tips, strategies, and the science behind word games.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/${locale}/blog/science-behind-word-games`}>
              <Button variant="outline" size="sm" className="rounded-neo border-2 border-neo-black font-bold text-xs">
                {t('blog.scienceTitle')}
              </Button>
            </Link>
            <Link href={`/${locale}/blog/daily-challenge-strategies`}>
              <Button variant="outline" size="sm" className="rounded-neo border-2 border-neo-black font-bold text-xs">
                {t('blog.strategiesTitle')}
              </Button>
            </Link>
            <Link href={`/${locale}/blog`}>
              <Button size="sm" className="rounded-neo border-2 border-neo-black bg-neo-cyan text-neo-black font-bold text-xs shadow-hard-sm">
                {t('landing.seo.viewAllPosts') || 'View all posts →'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
