'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { SiKofi } from 'react-icons/si';

/**
 * Footer - Neo-Brutalist styled footer
 */
export default function Footer(): React.ReactElement {
  const { t, language } = useLanguage();

  return (
    <footer className="py-6 px-4 mt-auto border-t-4 border-neo-black bg-neo-navy text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <p className="text-sm font-medium text-neo-cream/90">
            {t('legal.copyright')}
          </p>

          {/* Site Links - min-h-[44px] for touch targets */}
          <nav
            className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center sm:justify-start"
            role="navigation"
            aria-label="Footer navigation"
          >
            <Link
              href={`/${language}/rules`}
              className="
                min-h-[44px] px-2 flex items-center
                text-sm font-bold uppercase tracking-wide
                text-neo-cream/90 hover:text-neo-cyan
                transition-colors duration-100
                hover:underline underline-offset-4 decoration-2
              "
            >
              {t('footer.howToPlay') || 'How to Play'}
            </Link>
            <span className="text-neo-cream/90 font-black hidden sm:inline">•</span>
            <Link
              href={`/${language}/leaderboard`}
              className="
                min-h-[44px] px-2 flex items-center
                text-sm font-bold uppercase tracking-wide
                text-neo-cream/90 hover:text-neo-cyan
                transition-colors duration-100
                hover:underline underline-offset-4 decoration-2
              "
            >
              {t('footer.leaderboard') || 'Leaderboard'}
            </Link>
            <span className="text-neo-cream/90 font-black hidden sm:inline">•</span>
            <Link
              href={`/${language}/legal/terms`}
              className="
                min-h-[44px] px-2 flex items-center
                text-sm font-bold uppercase tracking-wide
                text-neo-cream/90 hover:text-neo-yellow
                transition-colors duration-100
                hover:underline underline-offset-4 decoration-2
              "
            >
              {t('legal.termsOfService')}
            </Link>
            <span className="text-neo-cream/90 font-black hidden sm:inline">•</span>
            <Link
              href={`/${language}/legal/privacy`}
              className="
                min-h-[44px] px-2 flex items-center
                text-sm font-bold uppercase tracking-wide
                text-neo-cream/90 hover:text-neo-yellow
                transition-colors duration-100
                hover:underline underline-offset-4 decoration-2
              "
            >
              {t('legal.privacyPolicy')}
            </Link>
            <span className="text-neo-cream/90 font-black hidden sm:inline">•</span>
            <a
              href="https://ko-fi.com/lexiclash"
              target="_blank"
              rel="noopener noreferrer"
              title={t('support.kofiTooltip')}
              className="
                min-h-[44px] px-2 inline-flex items-center gap-1.5
                text-sm font-bold uppercase tracking-wide
                text-neo-pink hover:text-neo-yellow
                transition-colors duration-100
                hover:underline underline-offset-4 decoration-2
                group
              "
            >
              <SiKofi className="text-base group-hover:animate-bounce" />
              <span>{t('support.kofiFooter')}</span>
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
