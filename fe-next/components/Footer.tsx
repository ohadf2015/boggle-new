'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// Kofi brand icon SVG component
const KofiIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/>
  </svg>
);

interface FooterProps {
  className?: string;
}

/**
 * Footer - Neo-Brutalist styled footer
 */
export default function Footer({ className }: FooterProps): React.ReactElement {
  const { t, language } = useLanguage();

  return (
    <footer className={cn('py-3 px-2 sm:px-3 lg:px-4 mt-auto border-t-4 border-neo-black bg-neo-navy text-white', className)}>
      <div className="w-full">
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
              {t('footer.aboutGame') || 'About the Game'}
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
              <KofiIcon className="text-base group-hover:animate-bounce" />
              <span>{t('support.kofiFooter')}</span>
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
