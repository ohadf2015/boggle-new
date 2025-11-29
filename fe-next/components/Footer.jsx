'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Footer - Neo-Brutalist styled footer
 */
export default function Footer() {
  const { t, language } = useLanguage();

  return (
    <footer className="py-6 px-4 mt-auto border-t-4 border-neo-black bg-neo-navy">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <p className="text-sm font-medium text-neo-cream/60">
            {t('legal.copyright')}
          </p>

          {/* Legal Links */}
          <nav className="flex items-center gap-3">
            <Link
              href={`/${language}/legal/terms`}
              className="
                text-sm font-bold uppercase tracking-wide
                text-neo-cream/70 hover:text-neo-yellow
                transition-colors duration-100
                hover:underline underline-offset-4 decoration-2
              "
            >
              {t('legal.termsOfService')}
            </Link>
            <span className="text-neo-cream/40 font-black">•</span>
            <Link
              href={`/${language}/legal/privacy`}
              className="
                text-sm font-bold uppercase tracking-wide
                text-neo-cream/70 hover:text-neo-yellow
                transition-colors duration-100
                hover:underline underline-offset-4 decoration-2
              "
            >
              {t('legal.privacyPolicy')}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
