'use client';

import React from 'react';
import Link from 'next/link';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';

export default function CookiePolicyPageClient(): React.ReactElement {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const textClass = cn('leading-relaxed', isDarkMode ? 'text-gray-300' : 'text-gray-600');
  const headingClass = cn('text-xl font-bold mb-3', isDarkMode ? 'text-white' : 'text-gray-900');
  const subheadingClass = cn('text-lg font-semibold mb-2 mt-4', isDarkMode ? 'text-white' : 'text-gray-900');
  const listClass = cn('list-disc pl-6 space-y-2', isDarkMode ? 'text-gray-300' : 'text-gray-600');

  return (
    <LegalPageLayout title={t('legal.cookies.title')} lastUpdated={t('legal.lastUpdatedDate')}>
      {/* Introduction */}
      <p className={cn('text-lg mb-6', isDarkMode ? 'text-gray-300' : 'text-gray-600')}>
        {t('legal.cookies.intro')}
      </p>

      {/* Section 1: What Are Cookies */}
      <section className="mb-6">
        <h2 className={headingClass}>{t('legal.cookies.whatAreCookies.title')}</h2>
        <p className={textClass}>{t('legal.cookies.whatAreCookies.content')}</p>
      </section>

      {/* Section 2: Cookies We Use */}
      <section className="mb-6">
        <h2 className={headingClass}>{t('legal.cookies.cookiesWeUse.title')}</h2>
        <p className={cn(textClass, 'mb-3')}>{t('legal.cookies.cookiesWeUse.intro')}</p>

        <h3 className={subheadingClass}>{t('legal.cookies.cookiesWeUse.essential.title')}</h3>
        <ul className={cn(listClass, 'mb-3')}>
          <li>{t('legal.cookies.cookiesWeUse.essential.auth')}</li>
          <li>{t('legal.cookies.cookiesWeUse.essential.prefs')}</li>
          <li>{t('legal.cookies.cookiesWeUse.essential.theme')}</li>
          <li>{t('legal.cookies.cookiesWeUse.essential.language')}</li>
        </ul>

        <h3 className={subheadingClass}>{t('legal.cookies.cookiesWeUse.analytics.title')}</h3>
        <ul className={cn(listClass, 'mb-3')}>
          <li>{t('legal.cookies.cookiesWeUse.analytics.logrocket')}</li>
        </ul>

        <h3 className={subheadingClass}>{t('legal.cookies.cookiesWeUse.advertising.title')}</h3>
        <ul className={listClass}>
          <li>{t('legal.cookies.cookiesWeUse.advertising.adsense')}</li>
          <li>{t('legal.cookies.cookiesWeUse.advertising.tfcd')}</li>
        </ul>
      </section>

      {/* Section 3: Third-Party Cookies */}
      <section className="mb-6">
        <h2 className={headingClass}>{t('legal.cookies.thirdPartyCookies.title')}</h2>
        <p className={cn(textClass, 'mb-3')}>{t('legal.cookies.thirdPartyCookies.intro')}</p>
        <ul className={listClass}>
          <li>{t('legal.cookies.thirdPartyCookies.google')}</li>
          <li>{t('legal.cookies.thirdPartyCookies.logrocket')}</li>
        </ul>
      </section>

      {/* Section 4: Managing Cookies */}
      <section className="mb-6">
        <h2 className={headingClass}>{t('legal.cookies.managingCookies.title')}</h2>
        <p className={cn(textClass, 'mb-3')}>{t('legal.cookies.managingCookies.intro')}</p>
        <ul className={cn(listClass, 'mb-3')}>
          <li>{t('legal.cookies.managingCookies.browser')}</li>
          <li>{t('legal.cookies.managingCookies.banner')}</li>
          <li>
            {t('legal.cookies.managingCookies.optOut')}:{' '}
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
            {t('legal.cookies.managingCookies.googlePrivacy')}:{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neo-cyan hover:underline font-medium"
            >
              Google Privacy Policy
            </a>
          </li>
        </ul>
      </section>

      {/* Section 5: Cookie Consent */}
      <section className="mb-6">
        <h2 className={headingClass}>{t('legal.cookies.consent.title')}</h2>
        <p className={cn(textClass, 'mb-3')}>{t('legal.cookies.consent.intro')}</p>
        <ul className={listClass}>
          <li>{t('legal.cookies.consent.accept')}</li>
          <li>{t('legal.cookies.consent.decline')}</li>
          <li>{t('legal.cookies.consent.change')}</li>
        </ul>
      </section>

      {/* Section 6: Changes to This Policy */}
      <section className="mb-6">
        <h2 className={headingClass}>{t('legal.cookies.changes.title')}</h2>
        <p className={textClass}>{t('legal.cookies.changes.content')}</p>
      </section>

      {/* Section 7: Contact Us */}
      <section className="mb-6">
        <h2 className={headingClass}>{t('legal.cookies.contactUs.title')}</h2>
        <p className={textClass}>
          {t('legal.cookies.contactUs.content')}{' '}
          <Link
            href={`/${language}/contact`}
            className="text-neo-cyan hover:underline font-medium"
          >
            {t('contact.title')}
          </Link>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
