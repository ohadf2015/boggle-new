'use client';

import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';

export default function DisclaimerPageClient(): React.ReactElement {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const sectionClass = cn(
    'leading-relaxed',
    isDarkMode ? 'text-gray-300' : 'text-gray-600'
  );

  const headingClass = cn(
    'text-xl font-bold mb-3',
    isDarkMode ? 'text-white' : 'text-gray-900'
  );

  return (
    <LegalPageLayout title={t('legal.disclaimer.title')}>
      {/* Last Updated */}
      <p className="text-sm mb-6 text-gray-500">
        {t('legal.lastUpdated')}: {t('legal.lastUpdatedDate')}
      </p>

      {/* General Disclaimer */}
      <section className="mb-6">
        <h2 className={headingClass}>
          {t('legal.disclaimer.general.title')}
        </h2>
        <p className={sectionClass}>
          {t('legal.disclaimer.general.content')}
        </p>
      </section>

      {/* No Professional Advice */}
      <section className="mb-6">
        <h2 className={headingClass}>
          {t('legal.disclaimer.noProfessionalAdvice.title')}
        </h2>
        <p className={sectionClass}>
          {t('legal.disclaimer.noProfessionalAdvice.content')}
        </p>
      </section>

      {/* As-Is */}
      <section className="mb-6">
        <h2 className={headingClass}>
          {t('legal.disclaimer.asIs.title')}
        </h2>
        <p className={sectionClass}>
          {t('legal.disclaimer.asIs.content')}
        </p>
      </section>

      {/* Third-Party Links */}
      <section className="mb-6">
        <h2 className={headingClass}>
          {t('legal.disclaimer.thirdParty.title')}
        </h2>
        <p className={sectionClass}>
          {t('legal.disclaimer.thirdParty.content')}
        </p>
      </section>

      {/* Advertising Content */}
      <section className="mb-6">
        <h2 className={headingClass}>
          {t('legal.disclaimer.advertising.title')}
        </h2>
        <p className={sectionClass}>
          {t('legal.disclaimer.advertising.content')}
        </p>
      </section>

      {/* Limitation of Liability */}
      <section className="mb-6">
        <h2 className={headingClass}>
          {t('legal.disclaimer.liability.title')}
        </h2>
        <p className={sectionClass}>
          {t('legal.disclaimer.liability.content')}
        </p>
      </section>

      {/* Changes to Disclaimer */}
      <section className="mb-6">
        <h2 className={headingClass}>
          {t('legal.disclaimer.changes.title')}
        </h2>
        <p className={sectionClass}>
          {t('legal.disclaimer.changes.content')}
        </p>
      </section>

      {/* Contact */}
      <section className="mb-6">
        <h2 className={headingClass}>
          {t('legal.disclaimer.contact.title')}
        </h2>
        <p className={sectionClass}>
          {t('legal.disclaimer.contact.content')}
        </p>
      </section>
    </LegalPageLayout>
  );
}
