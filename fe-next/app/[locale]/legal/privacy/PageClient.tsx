'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import { contentByLocale, type PrivacyContent } from './content';

export default function PrivacyPolicyPageClient(): React.ReactElement {
  const params = useParams();
  const locale = params.locale as string;
  const c: PrivacyContent = contentByLocale[locale] || contentByLocale.en;
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const headingClass = cn('text-xl font-bold mb-3', isDarkMode ? 'text-white' : 'text-gray-900');
  const textClass = cn('leading-relaxed', isDarkMode ? 'text-gray-300' : 'text-gray-600');
  const listClass = cn('list-disc ps-6 space-y-2', isDarkMode ? 'text-gray-300' : 'text-gray-600');
  const subheadingClass = cn('text-lg font-semibold mb-2 mt-4', isDarkMode ? 'text-white' : 'text-gray-900');

  return (
    <LegalPageLayout title={c.title}>
      {/* Introduction */}
      <p className={cn('text-lg mb-6', textClass)}>{c.intro}</p>

      {/* All sections */}
      {c.sections.map((section) => (
        <section key={section.title} className="mb-6">
          <h2 className={headingClass}>{section.title}</h2>
          <p className={cn(textClass, section.items || section.subsections ? 'mb-3' : '')}>
            {section.content}
          </p>

          {/* Bullet items */}
          {section.items && (
            <ul className={listClass}>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}

          {/* Subsections (e.g. advertising) */}
          {section.subsections?.map((sub) => (
            <div key={sub.title}>
              <h3 className={subheadingClass}>{sub.title}</h3>
              {sub.content && <p className={cn(textClass, 'mb-2')}>{sub.content}</p>}
              {sub.items && (
                <ul className={cn(listClass, 'mb-3')}>
                  {sub.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      ))}
    </LegalPageLayout>
  );
}
