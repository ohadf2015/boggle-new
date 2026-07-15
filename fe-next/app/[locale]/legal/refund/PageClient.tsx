'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import { contentByLocale, type RefundContent } from './content';

export default function RefundPolicyPageClient(): React.ReactElement {
  const params = useParams();
  const locale = params.locale as string;
  const c: RefundContent = contentByLocale[locale] || contentByLocale.en;
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <LegalPageLayout title={c.title}>
      {/* Introduction */}
      <p className={cn(
        'text-lg mb-6',
        isDarkMode ? 'text-gray-300' : 'text-gray-600'
      )}>
        {c.intro}
      </p>

      {/* Sections */}
      {c.sections.map((section) => (
        <section key={section.title} className="mb-6">
          <h2 className={cn(
            'text-xl font-bold mb-3',
            isDarkMode ? 'text-white' : 'text-gray-900'
          )}>
            {section.title}
          </h2>
          <p className={cn(
            'leading-relaxed',
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          )}>
            {section.content}
          </p>
        </section>
      ))}
    </LegalPageLayout>
  );
}
