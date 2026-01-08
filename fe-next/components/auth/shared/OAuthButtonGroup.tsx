'use client';

import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { GoogleIcon, DiscordIcon } from './icons/BrandIcons';
import { cn } from '@/lib/utils';
import type { OAuthProvider } from './types';

interface OAuthButtonGroupProps {
  onSignIn: (provider: 'google' | 'discord') => void;
  loadingProvider: string | null;
  disabled?: boolean;
  className?: string;
}

/**
 * OAuth sign-in buttons for Google and Discord
 */
export function OAuthButtonGroup({
  onSignIn,
  loadingProvider,
  disabled = false,
  className,
}: OAuthButtonGroupProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  const providers: OAuthProvider[] = [
    {
      id: 'google',
      icon: GoogleIcon,
      label: 'Google',
      color: isDarkMode
        ? 'bg-white text-gray-900 hover:bg-gray-100'
        : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300',
    },
    {
      id: 'discord',
      icon: DiscordIcon,
      label: 'Discord',
      color: 'bg-[#5865F2] text-white hover:bg-[#4752C4]',
    },
  ];

  const isAnyLoading = loadingProvider !== null || disabled;

  return (
    <div className={cn('space-y-3', className)}>
      {providers.map((provider) => (
        <Button
          key={provider.id}
          onClick={() => onSignIn(provider.id)}
          disabled={isAnyLoading}
          className={cn(
            'w-full h-12 text-base font-medium rounded-xl transition-all',
            provider.color
          )}
        >
          {loadingProvider === provider.id ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <provider.icon className="w-5 h-5" />
          )}
          <span className="ml-2">
            {t('auth.signInWith', { provider: provider.label })}
          </span>
        </Button>
      ))}
    </div>
  );
}

export default OAuthButtonGroup;
