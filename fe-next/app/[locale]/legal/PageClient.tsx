'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';

export default function LegalIndexPageClient(): React.ReactElement {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = params.locale as string;
  const isDarkMode = theme === 'dark';

  const legalPages = [
    {
      href: `/${locale}/about`,
      titleKey: 'legal.about.title',
      descriptionKey: 'legal.index.aboutDescription',
      icon: 'ℹ️',
    },
    {
      href: `/${locale}/legal/terms`,
      titleKey: 'legal.terms.title',
      descriptionKey: 'legal.index.termsDescription',
      icon: '📜',
    },
    {
      href: `/${locale}/legal/privacy`,
      titleKey: 'legal.privacy.title',
      descriptionKey: 'legal.index.privacyDescription',
      icon: '🔒',
    },
    {
      href: `/${locale}/legal/cookies`,
      titleKey: 'legal.cookies.title',
      descriptionKey: 'legal.index.cookiesDescription',
      icon: '🍪',
    },
    {
      href: `/${locale}/legal/disclaimer`,
      titleKey: 'legal.disclaimer.title',
      descriptionKey: 'legal.index.disclaimerDescription',
      icon: '⚠️',
    },
  ];

  return (
    <LegalPageLayout title={t('legal.index.title')}>
      <p className={cn(
        'text-lg mb-8',
        isDarkMode ? 'text-gray-300' : 'text-gray-600'
      )}>
        {t('legal.index.intro')}
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {legalPages.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className={cn(
              'block p-6 rounded-lg border transition-all hover:scale-[1.02]',
              isDarkMode
                ? 'bg-neo-navy-light border-gray-700 hover:border-purple-500'
                : 'bg-white border-gray-200 hover:border-purple-500 shadow-xs hover:shadow-md'
            )}
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl">{page.icon}</span>
              <div>
                <h2 className={cn(
                  'text-xl font-bold mb-2',
                  isDarkMode ? 'text-white' : 'text-gray-900'
                )}>
                  {t(page.titleKey)}
                </h2>
                <p className="text-sm text-gray-600">
                  {t(page.descriptionKey)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </LegalPageLayout>
  );
}
