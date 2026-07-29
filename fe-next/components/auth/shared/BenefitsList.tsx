'use client';

import { m } from 'framer-motion';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { AuthBenefit } from './types';

interface BenefitsListProps {
  benefits: AuthBenefit[];
  titleKey?: string;
  className?: string;
  animationDelay?: number;
}

/**
 * Animated list of benefits for auth signup modals
 */
export function BenefitsList({
  benefits,
  titleKey,
  className,
  animationDelay = 0.1,
}: BenefitsListProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  return (
    <m.div
      className={cn(
        'p-4 rounded-xl',
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
        {benefits.map((benefit, index) => (
          <m.li
            key={benefit.translationKey}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: animationDelay * (index + 1) }}
            className="flex items-center gap-2 text-sm"
          >
            <benefit.icon className={cn(
              'shrink-0 w-4 h-4',
              isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
            )} />
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              {t(benefit.translationKey)}
            </span>
          </m.li>
        ))}
      </ul>
    </m.div>
  );
}

export default BenefitsList;
