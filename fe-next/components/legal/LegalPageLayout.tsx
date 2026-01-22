'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface LegalPageLayoutProps {
    children: React.ReactNode;
    title: string;
    lastUpdated?: string;
}

export default function LegalPageLayout({
    children,
    title,
    lastUpdated = 'November 2025'
}: LegalPageLayoutProps): React.ReactElement {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isDarkMode = theme === 'dark';

  return (
    <div className={cn(
      'flex-1 flex flex-col',
      isDarkMode ? 'bg-neo-navy' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    )}>
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Page Title */}
        <motion.div
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
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            'rounded-2xl p-6 md:p-8',
            isDarkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200 shadow-lg'
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
        </motion.div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => router.push(`/${language}`)}
            className={cn(
              'rounded-full font-bold',
              isDarkMode
                ? 'border-slate-500 bg-slate-700 text-slate-100 hover:bg-slate-600 hover:text-white'
                : 'border-gray-400 bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-gray-900'
            )}
          >
            <ArrowLeft className="me-2 rtl:rotate-180" />
            {t('legal.backToGame')}
          </Button>
        </div>

        {/* Copyright Footer */}
        <footer className={cn(
          'mt-12 pt-6 border-t text-center text-sm',
          isDarkMode ? 'border-slate-700 text-gray-600' : 'border-gray-200 text-gray-600'
        )}>
          {t('legal.copyright')}
        </footer>
      </div>
    </div>
  );
}
