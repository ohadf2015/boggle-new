'use client';

import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { AuthBenefit } from './types';

interface BenefitsListProps {
  benefits: AuthBenefit[];
  titleKey?: string;
  className?: string;
}

/**
 * List of benefits for auth signup modals.
 *
 * Uses a CSS entrance (`animate-in`) rather than per-item framer-motion reveals:
 * JS-driven reveals can leave the items pinned at their invisible `initial` state
 * when the main thread is starved (e.g. parsing the large Hebrew bundle), which
 * showed up as popups rendering only the dark backdrop. CSS animations settle to
 * the visible resting state regardless, so content can never get stuck hidden.
 */
export function BenefitsList({
  benefits,
  titleKey,
  className,
}: BenefitsListProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  return (
    <div
      className={cn(
        'p-4 rounded-xl animate-in fade-in-0 duration-300',
        isDarkMode ? 'bg-neo-navy-elevated/50' : 'bg-gray-50',
        className
      )}
    >
      {titleKey && (
        <p className={cn(
          'text-sm font-medium mb-3',
          isDarkMode ? 'text-gray-200' : 'text-gray-700'
        )}>
          {t(titleKey)}
        </p>
      )}
      <ul className="space-y-2">
        {benefits.map((benefit) => (
          <li
            key={benefit.translationKey}
            className="flex items-center gap-2 text-sm"
          >
            <benefit.icon className={cn(
              'shrink-0 w-4 h-4',
              isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
            )} />
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              {t(benefit.translationKey)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default BenefitsList;
