'use client';

import React from 'react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';

export default function PrivacyPolicyPage() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <LegalPageLayout title={t('legal.privacy.title')}>
      {/* Introduction */}
      <p className={cn(
        'text-lg mb-6',
        isDarkMode ? 'text-gray-300' : 'text-gray-600'
      )}>
        {t('legal.privacy.intro')}
      </p>

      {/* Section 1: Information We Collect */}
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.privacy.infoCollected.title')}
        </h2>
        <p className={cn(
          'leading-relaxed mb-3',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.privacy.infoCollected.content')}
        </p>
        <ul className={cn(
          'list-disc pl-6 space-y-2',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          <li>{t('legal.privacy.infoCollected.oauth')}</li>
          <li>{t('legal.privacy.infoCollected.profile')}</li>
          <li>{t('legal.privacy.infoCollected.stats')}</li>
          <li>{t('legal.privacy.infoCollected.gameState')}</li>
          <li>{t('legal.privacy.infoCollected.analytics')}</li>
        </ul>
      </section>

      {/* Section 2: How We Use Information */}
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.privacy.howWeUse.title')}
        </h2>
        <p className={cn(
          'leading-relaxed',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.privacy.howWeUse.content')}
        </p>
      </section>

      {/* Section 3: Third-Party Services */}
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.privacy.thirdParties.title')}
        </h2>
        <p className={cn(
          'leading-relaxed mb-3',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.privacy.thirdParties.content')}
        </p>
        <ul className={cn(
          'list-disc pl-6 space-y-2',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          <li>{t('legal.privacy.thirdParties.supabase')}</li>
          <li>{t('legal.privacy.thirdParties.logrocket')}</li>
          <li>{t('legal.privacy.thirdParties.google')}</li>
          <li>{t('legal.privacy.thirdParties.discord')}</li>
        </ul>
        <p className={cn(
          'leading-relaxed mt-3 font-medium',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.privacy.thirdParties.noSale')}
        </p>
      </section>

      {/* Section 4: Cookies */}
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.privacy.cookies.title')}
        </h2>
        <p className={cn(
          'leading-relaxed',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.privacy.cookies.content')}
        </p>
      </section>

      {/* Section 5: Data Retention */}
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.privacy.dataRetention.title')}
        </h2>
        <p className={cn(
          'leading-relaxed',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.privacy.dataRetention.content')}
        </p>
      </section>

      {/* Section 6: Security */}
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.privacy.security.title')}
        </h2>
        <p className={cn(
          'leading-relaxed',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.privacy.security.content')}
        </p>
      </section>

      {/* Section 7: Your Rights */}
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.privacy.yourRights.title')}
        </h2>
        <p className={cn(
          'leading-relaxed',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.privacy.yourRights.content')}
        </p>
      </section>

      {/* Section 8: International Users */}
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.privacy.international.title')}
        </h2>
        <p className={cn(
          'leading-relaxed',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.privacy.international.content')}
        </p>
      </section>

      {/* Section 9: Changes */}
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.privacy.changes.title')}
        </h2>
        <p className={cn(
          'leading-relaxed',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.privacy.changes.content')}
        </p>
      </section>

      {/* Section 10: Governing Law */}
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.privacy.governingLaw.title')}
        </h2>
        <p className={cn(
          'leading-relaxed',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.privacy.governingLaw.content')}
        </p>
      </section>
    </LegalPageLayout>
  );
}
