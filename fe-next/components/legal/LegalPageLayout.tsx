'use client';

import React from 'react';
import { m } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBackOneLevel } from '@/hooks/useBackOneLevel';
import { cn } from '@/lib/utils';

interface LegalPageLayoutProps {
    children: React.ReactNode;
    title: string;
    lastUpdated?: string;
    /** Custom breadcrumb items. Defaults to Legal > title */
    breadcrumbs?: { label: string; href?: string }[];
}

export default function LegalPageLayout({
    children,
    title,
    lastUpdated = 'November 2025',
    breadcrumbs,
}: LegalPageLayoutProps): React.ReactElement {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const router = useRouter();
  const goBack = useBackOneLevel();
  const isDarkMode = theme === 'dark';

  return (
    <div className={cn(
      'flex-1 flex flex-col',
      isDarkMode ? 'bg-neo-navy' : 'bg-linear-to-br from-blue-50 via-white to-purple-50'
    )}>
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={breadcrumbs || [
            { label: t('legal.title'), href: `/${language}/legal` },
            { label: title },
          ]}
        />

        {/* Page Title */}
        <m.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className={cn(
            'text-3xl font-bold mb-2',
            isDarkMode ? 'text-white' : 'text-gray-900'
          )}>
            {title}
          </h1>
          <p className={cn(
            'text-sm',
            isDarkMode ? 'text-gray-600' : 'text-gray-600'
          )}>
            {t('legal.lastUpdated')}: {lastUpdated}
          </p>
        </m.div>

        {/* Content */}
        <m.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            'rounded-2xl p-6 md:p-8',
            isDarkMode ? 'bg-neo-navy-light/50 border border-slate-700' : 'bg-white border border-gray-200 shadow-lg'
          )}
        >
          <div className={cn(
            'prose max-w-none',
            isDarkMode ? 'prose-invert' : '',
            'prose-headings:font-bold prose-headings:mb-3 prose-headings:mt-6 first:prose-headings:mt-0',
            'prose-p:leading-relaxed prose-p:mb-4',
            'prose-ul:my-4 prose-li:my-1',
            isDarkMode
              ? 'prose-headings:text-white prose-p:text-gray-300 prose-li:text-gray-300'
              : 'prose-headings:text-gray-900 prose-p:text-gray-600 prose-li:text-gray-600'
          )}>
            {children}
          </div>
        </m.div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={goBack}
            className={cn(
              'rounded-full font-bold',
              isDarkMode
                ? 'border-slate-500 bg-neo-navy-elevated text-slate-100 hover:bg-slate-600 hover:text-white'
                : 'border-gray-400 bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-gray-900'
            )}
          >
            <ArrowLeft className="me-2 rtl:rotate-180" />
            {t('legal.backToGame')}
          </Button>
        </div>

        {/* Footer with Links */}
        <footer className={cn(
          'mt-12 pt-6 border-t text-center',
          isDarkMode ? 'border-slate-700' : 'border-gray-200'
        )}>
          {/* Footer Links */}
          <nav className="mb-4">
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
              <li>
                <a
                  href={`/${language}/about`}
                  className={cn(
                    'hover:underline font-medium',
                    isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {t('legal.about.title')}
                </a>
              </li>
              <li>
                <a
                  href={`/${language}/legal/terms`}
                  className={cn(
                    'hover:underline font-medium',
                    isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {t('legal.termsOfService')}
                </a>
              </li>
              <li>
                <a
                  href={`/${language}/legal/privacy`}
                  className={cn(
                    'hover:underline font-medium',
                    isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {t('legal.privacyPolicy')}
                </a>
              </li>
              <li>
                <a
                  href={`/${language}/legal/refund`}
                  className={cn(
                    'hover:underline font-medium',
                    isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {t('legal.refundPolicy')}
                </a>
              </li>
              <li>
                <a
                  href={`/${language}/legal/cookies`}
                  className={cn(
                    'hover:underline font-medium',
                    isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {t('footer.cookiePolicy')}
                </a>
              </li>
              <li>
                <a
                  href={`/${language}/legal/disclaimer`}
                  className={cn(
                    'hover:underline font-medium',
                    isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {t('legal.disclaimer.title')}
                </a>
              </li>
              <li>
                <a
                  href={`/${language}/contact`}
                  className={cn(
                    'hover:underline font-medium',
                    isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {t('contact.title')}
                </a>
              </li>
            </ul>
          </nav>

          {/* Copyright */}
          <p className={cn(
            'text-sm',
            isDarkMode ? 'text-gray-600' : 'text-gray-600'
          )}>
            {t('legal.copyright', { year: new Date().getFullYear() })}
          </p>
        </footer>
      </div>
    </div>
  );
}
