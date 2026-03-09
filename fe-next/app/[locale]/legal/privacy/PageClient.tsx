'use client';

import React from 'react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';

export default function PrivacyPolicyPageClient(): React.ReactElement {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <LegalPageLayout title={t('legal.privacy.title')} lastUpdated={t('legal.lastUpdatedDate')}>
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

      {/* Section 4: Third-Party Advertising */}
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.privacy.advertisingPartners.title')}
        </h2>
        <p className={cn(
          'leading-relaxed mb-3',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.privacy.advertisingPartners.intro')}
        </p>

        <h3 className={cn(
          'text-lg font-semibold mb-2 mt-4',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.privacy.advertisingPartners.howItWorks.title')}
        </h3>
        <ul className={cn(
          'list-disc pl-6 space-y-2 mb-3',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          <li>{t('legal.privacy.advertisingPartners.howItWorks.cookies')}</li>
          <li>{t('legal.privacy.advertisingPartners.howItWorks.control')}</li>
          <li>{t('legal.privacy.advertisingPartners.howItWorks.noSale')}</li>
          <li>{t('legal.privacy.advertisingPartners.howItWorks.revenue')}</li>
          <li>{t('legal.privacy.advertisingPartners.howItWorks.thirdParty')}</li>
        </ul>

        <h3 className={cn(
          'text-lg font-semibold mb-2 mt-4',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.privacy.advertisingPartners.yourChoices.title')}
        </h3>
        <p className={cn(
          'leading-relaxed mb-2',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.privacy.advertisingPartners.yourChoices.intro')}
        </p>
        <ul className={cn(
          'list-disc pl-6 space-y-2 mb-3',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          <li>
            {t('legal.privacy.advertisingPartners.yourChoices.optOut')}:{' '}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neo-cyan hover:underline font-medium"
            >
              Google Ad Settings
            </a>
          </li>
          <li>
            {t('legal.privacy.advertisingPartners.yourChoices.googlePrivacy')}:{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neo-cyan hover:underline font-medium"
            >
              Google Privacy Policy
            </a>
          </li>
          <li>
            {t('legal.privacy.advertisingPartners.yourChoices.partnerPolicy')}:{' '}
            <a
              href="https://support.google.com/adsense/answer/48182"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neo-cyan hover:underline font-medium"
            >
              AdSense Partner Policy
            </a>
          </li>
          <li>{t('legal.privacy.advertisingPartners.yourChoices.browserCookies')}</li>
          <li>
            {t('legal.privacy.advertisingPartners.yourChoices.aboutAds')}{' '}
            <a
              href="https://www.aboutads.info/choices"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neo-cyan hover:underline font-medium"
            >
              aboutads.info
            </a>
          </li>
        </ul>

        <div className={cn(
          'p-4 rounded-neo border-2 border-neo-black mt-4',
          isDarkMode ? 'bg-slate-800' : 'bg-neo-yellow/10'
        )}>
          <p className={cn(
            'text-sm font-medium',
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          )}>
            <strong>{t('legal.privacy.advertisingPartners.important.title')}</strong>{' '}
            {t('legal.privacy.advertisingPartners.important.content')}{' '}
            <a
              href="https://www.aboutads.info/choices"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neo-cyan hover:underline"
            >
              aboutads.info
            </a>.
          </p>
        </div>
      </section>

      {/* Section 5: Cookies */}
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

      {/* Section 6: Data Retention */}
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

      {/* Section 7: Security */}
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

      {/* Section 8: Your Rights */}
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

      {/* Section 9: International Users */}
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

      {/* Section 10: Changes */}
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

      {/* Section 11: Governing Law */}
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

      {/* Section 12: Children's Privacy */}
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.privacy.childrensPrivacy.title')}
        </h2>
        <p className={cn(
          'leading-relaxed mb-3',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.privacy.childrensPrivacy.content')}
        </p>
        <p className={cn(
          'font-semibold mb-2',
          isDarkMode ? 'text-gray-200' : 'text-gray-700'
        )}>
          {t('legal.privacy.childrensPrivacy.measures')}
        </p>
        <ul className={cn(
          'list-disc pl-6 space-y-2',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          <li>{t('legal.privacy.childrensPrivacy.noPersonalizedAds')}</li>
          <li>{t('legal.privacy.childrensPrivacy.noAdTracking')}</li>
          <li>{t('legal.privacy.childrensPrivacy.minimalData')}</li>
          <li>{t('legal.privacy.childrensPrivacy.parentalInvolvement')}</li>
          <li>{t('legal.privacy.childrensPrivacy.noDataSale')}</li>
          <li>{t('legal.privacy.childrensPrivacy.parentContact')}</li>
        </ul>
      </section>
    </LegalPageLayout>
  );
}
