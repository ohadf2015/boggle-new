'use client';

import { m } from 'framer-motion';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';
import { GoogleIcon, DiscordIcon } from './icons/BrandIcons';
import { cn } from '@/lib/utils';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import type { OAuthProvider } from './types';

interface OAuthButtonGroupProps {
  onSignIn: (provider: 'google' | 'discord') => void;
  loadingProvider: string | null;
  disabled?: boolean;
  className?: string;
}

/**
 * OAuth sign-in buttons for Google and Discord.
 * When on CrazyGames platform, shows CrazyGames auth instead.
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
  const { isOnCrazyGamesPlatform, showAuthPrompt } = useCrazyGames();

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
      color: 'bg-brand-discord text-white hover:bg-brand-discord-hover',
    },
  ];

  const isAnyLoading = loadingProvider !== null || disabled;

  // On CrazyGames platform, show CrazyGames auth instead of OAuth buttons
  if (isOnCrazyGamesPlatform) {
    return (
      <div className={cn('space-y-3', className)}>
        <Button
          onClick={() => showAuthPrompt()}
          disabled={isAnyLoading}
          className={cn(
            'w-full h-12 text-base font-medium rounded-xl transition-all',
            'bg-neo-pink text-white hover:bg-neo-pink/90'
          )}
        >
          {loadingProvider === 'crazygames' ? (
            <Loader size="sm" />
          ) : (
            <span>{t('auth.loginCrazyGames')}</span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {providers.map((provider, i) => (
        <m.div
          key={provider.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * i, type: 'spring', stiffness: 400, damping: 24 }}
        >
          <Button
            onClick={() => onSignIn(provider.id)}
            disabled={isAnyLoading}
            className={cn(
              'w-full h-12 text-base font-medium rounded-xl transition-all',
              provider.color
            )}
          >
            {loadingProvider === provider.id ? (
              <Loader size="sm" />
            ) : (
              <provider.icon className="w-5 h-5" />
            )}
            <span className="ms-2">
              {t('auth.signInWith', { provider: provider.label })}
            </span>
          </Button>
        </m.div>
      ))}
    </div>
  );
}

export default OAuthButtonGroup;
