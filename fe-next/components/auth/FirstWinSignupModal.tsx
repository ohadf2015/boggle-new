'use client';

import React, { useEffect } from 'react';
import { m } from 'framer-motion';
import { Trophy, TrendingUp, Medal, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '../ui/dialog';
import { Reveal } from '../ui/Reveal';
import { fireConfetti } from '@/utils/confettiUtils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getGuestStatsSummary } from '@/utils/guestManager';
import { cn } from '@/lib/utils';

// Shared auth components
import {
  OAuthButtonGroup,
  AuthTermsFooter,
  AuthErrorMessage,
  type AuthBenefit,
} from './shared';
import { useOAuthSignIn } from './hooks/useOAuthSignIn';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useExperiment } from '@/hooks/useExperiment';

interface FirstWinSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Variant: 'firstWin' for win celebration, 'multiGames' for engagement after multiple games */
  variant?: 'firstWin' | 'multiGames';
}

interface GuestStats {
  gamesPlayed: number;
  totalScore: number;
}

const benefits: AuthBenefit[] = [
  { icon: TrendingUp, translationKey: 'auth.firstWin.benefits.trackProgress' },
  { icon: Medal, translationKey: 'auth.firstWin.benefits.leaderboard' },
  { icon: Users, translationKey: 'auth.firstWin.benefits.playWithFriends' },
];

const FirstWinSignupModal: React.FC<FirstWinSignupModalProps> = ({
  isOpen,
  onClose,
  variant = 'firstWin',
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const isDarkMode = theme === 'dark';

  const { signIn, loadingProvider, error } = useOAuthSignIn();

  const guestStats: GuestStats = getGuestStatsSummary();
  const isMultiGamesVariant = variant === 'multiGames';

  // A/B: subtitle copy variant. Title + OAuth UI stay constant so we
  // isolate the conversion delta to the persuasion line.
  const { variant: ctaVariant, trackExposure: trackCtaExposure } =
    useExperiment('signup-prompt-cta-copy');

  // Map variant → translation key suffix for both firstWin & multiGames
  // namespaces. Falls back to base `subtitle` for control.
  const subtitleKey = (() => {
    const ns = isMultiGamesVariant ? 'auth.multiGames' : 'auth.firstWin';
    if (ctaVariant === 'urgency') return `${ns}.subtitleUrgency`;
    if (ctaVariant === 'value-prop') return `${ns}.subtitleValueProp`;
    return `${ns}.subtitle`;
  })();

  // Fire exposure only when the modal actually opens (it is mounted
  // globally via SignupPromptHost — most users never see it).
  useEffect(() => {
    if (isOpen) trackCtaExposure();
  }, [isOpen, trackCtaExposure]);

  // Trigger celebratory confetti when modal opens (only for firstWin variant)
  useEffect(() => {
    if (isOpen && !isMultiGamesVariant) {
      const timer = setTimeout(() => {
        fireConfetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.4 },
          colors: ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#9370DB'],
        });
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, isMultiGamesVariant]);

  if (isOnCrazyGamesPlatform) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        noDescription
        className={cn(
          'max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl',
          isDarkMode
            ? 'bg-neo-navy border border-yellow-500/30'
            : 'bg-white border border-yellow-400/50'
        )}
      >
        <DialogHeader variant="gradient" customBg="bg-transparent" className="border-b-0 p-0">
          <DialogTitle className="sr-only">
            {isMultiGamesVariant
              ? t('auth.multiGames.title')
              : t('auth.firstWin.title')}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="relative p-6 pt-0">
          {/* Decorative background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-linear-to-b from-yellow-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />


          {/* Trophy animation. Reveal (CSS) guarantees the trophy is visible even
              if the JS animation loop is starved; the inner pulse/sparkles below
              stay on framer-motion since they are continuous, decorative loops. */}
          <Reveal noSlide className="flex justify-center mb-4">
            <div className="relative">
              <m.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [-5, 5, -5],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Trophy
                  className="text-6xl text-yellow-500 drop-shadow-[0_0_20px_rgb(234_179_8/0.5)]"
                  size={64}
                />
              </m.div>
              {/* Sparkle effects */}
              <m.div
                className="absolute -top-2 -right-2 rtl:-right-auto rtl:-left-2 w-4 h-4 bg-yellow-300 rounded-full"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
              />
              <m.div
                className="absolute -top-1 -left-3 rtl:-left-auto rtl:-right-3 w-3 h-3 bg-yellow-400 rounded-full"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              />
              <m.div
                className="absolute -bottom-1 right-0 rtl:right-auto rtl:left-0 w-2 h-2 bg-orange-400 rounded-full"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
              />
            </div>
          </Reveal>

          {/* Header */}
          <Reveal className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2 text-neo-lime">
              {isMultiGamesVariant
                ? t('auth.multiGames.title')
                : t('auth.firstWin.title')}
            </h2>
            <p className={cn('text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-600')}>
              {t(subtitleKey)}
            </p>
          </Reveal>

          {/* Benefits list */}
          <Reveal
            className={cn('mb-6 p-4 rounded-xl', isDarkMode ? 'bg-neo-navy-elevated/50' : 'bg-gray-50')}
          >
            <p
              className={cn(
                'text-sm font-medium mb-3',
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              )}
            >
              {t('auth.firstWin.benefitsTitle')}
            </p>
            <ul className="space-y-2">
              {benefits.map((benefit) => (
                <li
                  key={benefit.translationKey}
                  className={cn(
                    'flex items-center gap-3 text-sm',
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  )}
                >
                  <benefit.icon
                    className={cn('shrink-0', isDarkMode ? 'text-cyan-400' : 'text-cyan-600')}
                    size={16}
                  />
                  <span>{t(benefit.translationKey)}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Current stats teaser */}
          {guestStats && guestStats.gamesPlayed > 0 && (
            <Reveal
              className={cn(
                'mb-6 p-3 rounded-lg text-center text-sm',
                isDarkMode
                  ? 'bg-cyan-900/30 border border-cyan-500/30'
                  : 'bg-cyan-50 border border-cyan-200'
              )}
            >
              <span className={isDarkMode ? 'text-cyan-300' : 'text-cyan-700'}>
                {t('auth.firstWin.statsTeaser', {
                  games: guestStats.gamesPlayed,
                  score: guestStats.totalScore,
                })}
              </span>
            </Reveal>
          )}

          {/* OAuth Sign In Buttons */}
          <Reveal>
            <OAuthButtonGroup onSignIn={signIn} loadingProvider={loadingProvider} />
          </Reveal>

          {/* Error Message */}
          {error && <AuthErrorMessage message={error} className="mt-4" />}

          {/* Continue as Guest */}
          <Reveal className="mt-6 text-center">
            <button type="button"
              onClick={onClose}
              className={cn(
                'text-sm hover:underline',
                isDarkMode ? 'text-gray-600 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'
              )}
            >
              {t('auth.firstWin.maybeLater')}
            </button>
          </Reveal>

          {/* Terms */}
          <AuthTermsFooter className="mt-4" />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};

export default FirstWinSignupModal;
