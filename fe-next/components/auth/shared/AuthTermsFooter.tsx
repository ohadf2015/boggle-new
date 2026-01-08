'use client';

import Link from 'next/link';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface AuthTermsFooterProps {
  className?: string;
}

/**
 * Terms and Privacy footer for auth modals
 * Displays links to terms of service and privacy policy
 */
export function AuthTermsFooter({ className }: AuthTermsFooterProps) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isDarkMode = theme === 'dark';

  return (
    <p className={cn(
      'text-xs text-center',
      isDarkMode ? 'text-gray-400' : 'text-gray-600',
      className
    )}>
      {t('auth.termsPrefix')}{' '}
      <Link
        href={`/${language}/legal/terms`}
        className={cn(
          'underline transition-colors',
          isDarkMode ? 'hover:text-cyan-400' : 'hover:text-cyan-600'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {t('auth.termsLink')}
      </Link>
      {' '}{t('auth.andText')}{' '}
      <Link
        href={`/${language}/legal/privacy`}
        className={cn(
          'underline transition-colors',
          isDarkMode ? 'hover:text-cyan-400' : 'hover:text-cyan-600'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {t('auth.privacyLink')}
      </Link>
    </p>
  );
}

export default AuthTermsFooter;
