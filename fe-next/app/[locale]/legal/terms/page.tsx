'use client';

import React from 'react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';

export default function TermsOfServicePage(): React.ReactElement {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const sections = [
    'acceptance',
    'service',
    'accounts',
    'conduct',
    'contentLicense',
    'intellectualProperty',
    'disclaimers',
    'liability',
    'indemnification',
    'termination',
    'modifications',
    'governingLaw',
    'disputes',
    'severability'
  ] as const;

  return (
    <LegalPageLayout title={t('legal.terms.title')}>
      {/* Introduction */}
      <p className={cn(
        'text-lg mb-6',
        isDarkMode ? 'text-gray-300' : 'text-gray-600'
      )}>
        {t('legal.terms.intro')}
      </p>

      {/* Sections */}
      {sections.map((section) => (
        <section key={section} className="mb-6">
          <h2 className={cn(
            'text-xl font-bold mb-3',
            isDarkMode ? 'text-white' : 'text-gray-900'
          )}>
            {t(`legal.terms.${section}.title`)}
          </h2>
          <p className={cn(
            'leading-relaxed',
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          )}>
            {t(`legal.terms.${section}.content`)}
          </p>
        </section>
      ))}
    </LegalPageLayout>
  );
}
