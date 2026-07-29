'use client';

import React from 'react';
import { m } from 'framer-motion';
import { TrendingUp, Medal, Users, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getGuestStatsSummary } from '@/utils/guestManager';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { cn } from '@/lib/utils';
import {
  OAuthButtonGroup,
  AuthErrorMessage,
  AuthTermsFooter,
  type AuthBenefit,
} from './shared';
import { useOAuthSignIn } from './hooks/useOAuthSignIn';

interface InlineSignupCardProps {
  isAuthenticated: boolean;
  className?: string;
}

const benefits: AuthBenefit[] = [
  { icon: TrendingUp, translationKey: 'auth.firstWin.benefits.trackProgress' },
  { icon: Medal, translationKey: 'auth.firstWin.benefits.leaderboard' },
  { icon: Users, translationKey: 'auth.firstWin.benefits.playWithFriends' },
];

/**
 * InlineSignupCard — neo-brutalist inline signup CTA shown on results pages
 * for unauthenticated guests. Replaces the FirstWinSignupModal popup with
 * a non-intrusive, context-aware card.
 */
const InlineSignupCard: React.FC<InlineSignupCardProps> = ({
  isAuthenticated,
  className,
}) => {
  const { t } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const { signIn, loadingProvider, error } = useOAuthSignIn();

  if (isAuthenticated) return null;
  if (isOnCrazyGamesPlatform) return null;

  const guestStats = getGuestStatsSummary();

  return (
    <m.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className={cn(
        'relative bg-neo-navy-light border-neo-thick border-neo-black shadow-hard rounded-neo p-4 sm:p-5 overflow-hidden',
        className,
      )}
      aria-label={t('auth.multiGames.title')}
    >
      {/* Decorative accent stripe */}
      <div
        aria-hidden
        className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-neo-lime via-neo-cyan to-neo-pink"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="text-neo-lime shrink-0" size={20} aria-hidden />
        <h3 className="font-neo-display text-lg sm:text-xl font-bold text-neo-white">
          {t('auth.multiGames.title')}
        </h3>
      </div>
      <p className="text-sm text-neo-white mb-4 leading-snug">
        {t('auth.multiGames.subtitle')}
      </p>

      {/* Benefits */}
      <ul className="space-y-2 mb-4">
        {benefits.map((benefit, index) => (
          <m.li
            key={benefit.translationKey}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + index * 0.08 }}
            className="flex items-center gap-2.5 text-sm text-neo-white"
          >
            <benefit.icon className="shrink-0 text-neo-cyan" size={16} aria-hidden />
            <span>{t(benefit.translationKey)}</span>
          </m.li>
        ))}
      </ul>

      {/* Guest stats teaser */}
      {guestStats.gamesPlayed > 0 && (
        <div className="mb-4 px-3 py-2 rounded-neo bg-neo-navy border-neo border-neo-cyan/40 text-center text-xs text-neo-cyan">
          {t('auth.firstWin.statsTeaser', {
            games: guestStats.gamesPlayed,
            score: guestStats.totalScore,
          })}
        </div>
      )}

      {/* OAuth buttons */}
      <OAuthButtonGroup onSignIn={signIn} loadingProvider={loadingProvider} />

      {error && <AuthErrorMessage message={error} className="mt-3" />}

      <AuthTermsFooter className="mt-3" />
    </m.section>
  );
};

export default InlineSignupCard;
