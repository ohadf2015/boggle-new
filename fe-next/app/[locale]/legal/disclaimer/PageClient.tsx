'use client';

import { useParams } from 'next/navigation';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import { contentByLocale, type DisclaimerContent } from './content';

export default function DisclaimerPageClient(): React.ReactElement {
  const params = useParams();
  const locale = params.locale as string;
  const c: DisclaimerContent = contentByLocale[locale] || contentByLocale.en;
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const headingClass = cn('text-xl font-bold mb-3', isDarkMode ? 'text-white' : 'text-gray-900');
  const textClass = cn('leading-relaxed', isDarkMode ? 'text-gray-300' : 'text-gray-600');

  return (
    <LegalPageLayout title={c.title}>
      {c.sections.map((section) => (
        <section key={section.title} className="mb-6">
          <h2 className={headingClass}>{section.title}</h2>
          <p className={textClass}>{section.content}</p>
        </section>
      ))}
    </LegalPageLayout>
  );
}
