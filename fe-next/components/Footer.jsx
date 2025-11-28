'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export default function Footer() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isDarkMode = theme === 'dark';

  return (
    <footer className={cn(
      'py-6 px-4 mt-auto border-t',
      isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-50 border-gray-200'
    )}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <p className={cn(
            'text-sm',
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          )}>
            {t('legal.copyright')}
          </p>

          {/* Legal Links */}
          <nav className="flex items-center gap-4">
            <Link
              href={`/${language}/legal/terms`}
              className={cn(
                'text-sm transition-colors',
                isDarkMode
                  ? 'text-gray-400 hover:text-cyan-400'
                  : 'text-gray-500 hover:text-cyan-600'
              )}
            >
              {t('legal.termsOfService')}
            </Link>
            <span className={cn(
              'text-sm',
              isDarkMode ? 'text-gray-600' : 'text-gray-300'
            )}>
              |
            </span>
            <Link
              href={`/${language}/legal/privacy`}
              className={cn(
                'text-sm transition-colors',
                isDarkMode
                  ? 'text-gray-400 hover:text-cyan-400'
                  : 'text-gray-500 hover:text-cyan-600'
              )}
            >
              {t('legal.privacyPolicy')}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
