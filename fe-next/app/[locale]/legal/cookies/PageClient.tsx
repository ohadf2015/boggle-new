'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import { contentByLocale, type CookiesContent } from './content';

export default function CookiePolicyPageClient(): React.ReactElement {
  const params = useParams();
  const locale = params.locale as string;
  const c: CookiesContent = contentByLocale[locale] || contentByLocale.en;
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const textClass = cn('leading-relaxed', isDarkMode ? 'text-gray-300' : 'text-gray-600');
  const headingClass = cn('text-xl font-bold mb-3', isDarkMode ? 'text-white' : 'text-gray-900');
  const subheadingClass = cn('text-lg font-semibold mb-2 mt-4', isDarkMode ? 'text-white' : 'text-gray-900');
  const listClass = cn('list-disc ps-6 space-y-2', isDarkMode ? 'text-gray-300' : 'text-gray-600');

  return (
    <LegalPageLayout title={c.title}>
      {/* Introduction */}
      <p className={cn('text-lg mb-6', isDarkMode ? 'text-gray-300' : 'text-gray-600')}>
        {c.intro}
      </p>

      {/* Section 1: What Are Cookies */}
      <section className="mb-6">
        <h2 className={headingClass}>{c.whatAreCookies.title}</h2>
        <p className={textClass}>{c.whatAreCookies.content}</p>
      </section>

      {/* Section 2: Cookies We Use */}
      <section className="mb-6">
        <h2 className={headingClass}>{c.cookiesWeUse.title}</h2>
        <p className={cn(textClass, 'mb-3')}>{c.cookiesWeUse.intro}</p>

        <h3 className={subheadingClass}>{c.cookiesWeUse.essential.title}</h3>
        <ul className={cn(listClass, 'mb-3')}>
          {c.cookiesWeUse.essential.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h3 className={subheadingClass}>{c.cookiesWeUse.analytics.title}</h3>
        <ul className={cn(listClass, 'mb-3')}>
          {c.cookiesWeUse.analytics.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h3 className={subheadingClass}>{c.cookiesWeUse.advertising.title}</h3>
        <ul className={listClass}>
          {c.cookiesWeUse.advertising.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Section 3: Third-Party Cookies */}
      <section className="mb-6">
        <h2 className={headingClass}>{c.thirdPartyCookies.title}</h2>
        <p className={cn(textClass, 'mb-3')}>{c.thirdPartyCookies.intro}</p>
        <ul className={listClass}>
          {c.thirdPartyCookies.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Section 4: Managing Cookies */}
      <section className="mb-6">
        <h2 className={headingClass}>{c.managingCookies.title}</h2>
        <p className={cn(textClass, 'mb-3')}>{c.managingCookies.intro}</p>
        <ul className={listClass}>
          {c.managingCookies.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Section 5: Cookie Consent */}
      <section className="mb-6">
        <h2 className={headingClass}>{c.consent.title}</h2>
        <p className={cn(textClass, 'mb-3')}>{c.consent.intro}</p>
        <ul className={listClass}>
          {c.consent.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Section 6: Changes to This Policy */}
      <section className="mb-6">
        <h2 className={headingClass}>{c.changes.title}</h2>
        <p className={textClass}>{c.changes.content}</p>
      </section>

      {/* Section 7: Contact Us */}
      <section className="mb-6">
        <h2 className={headingClass}>{c.contactUs.title}</h2>
        <p className={textClass}>
          {c.contactUs.content}{' '}
          <Link
            href={`/${locale}/contact`}
            className="text-neo-cyan hover:underline font-medium"
          >
            Contact
          </Link>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
