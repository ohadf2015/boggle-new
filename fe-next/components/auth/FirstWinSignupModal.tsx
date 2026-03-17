'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import { Trophy, TrendingUp, Medal, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '../ui/dialog';
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
  const isDarkMode = theme === 'dark';

  const { signIn, loadingProvider, error } = useOAuthSignIn();

  const guestStats: GuestStats = getGuestStatsSummary();
  const isMultiGamesVariant = variant === 'multiGames';

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
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-b from-yellow-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />


          {/* Trophy animation */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 10, stiffness: 100, delay: 0.2 }}
            className="flex justify-center mb-4"
          >
            <div className="relative">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [-5, 5, -5],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Trophy
                  className="text-6xl text-yellow-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]"
                  size={64}
                />
              </motion.div>
              {/* Sparkle effects */}
              <motion.div
                className="absolute -top-2 -right-2 rtl:-right-auto rtl:-left-2 w-4 h-4 bg-yellow-300 rounded-full"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="absolute -top-1 -left-3 rtl:-left-auto rtl:-right-3 w-3 h-3 bg-yellow-400 rounded-full"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              />
              <motion.div
                className="absolute -bottom-1 right-0 rtl:right-auto rtl:left-0 w-2 h-2 bg-orange-400 rounded-full"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
              />
            </div>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, ...SPRING_PRESETS.balanced }}
            className="text-center mb-6"
          >
            <h2 className="text-2xl font-bold mb-2 text-neo-lime">
              {isMultiGamesVariant
                ? t('auth.multiGames.title')
                : t('auth.firstWin.title')}
            </h2>
            <p className={cn('text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-600')}>
              {isMultiGamesVariant
                ? t('auth.multiGames.subtitle') ||
                  'Sign up to save your progress and track your achievements!'
                : t('auth.firstWin.subtitle')}
            </p>
          </motion.div>

          {/* Benefits list */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, ...SPRING_PRESETS.balanced }}
            className={cn('mb-6 p-4 rounded-xl', isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50')}
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
              {benefits.map((benefit, index) => (
                <motion.li
                  key={benefit.translationKey}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1, type: 'spring', stiffness: 380, damping: 26 }}
                  className={cn(
                    'flex items-center gap-3 text-sm',
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  )}
                >
                  <benefit.icon
                    className={cn('flex-shrink-0', isDarkMode ? 'text-cyan-400' : 'text-cyan-600')}
                    size={16}
                  />
                  <span>{t(benefit.translationKey)}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Current stats teaser */}
          {guestStats && guestStats.gamesPlayed > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, ...SPRING_PRESETS.balanced }}
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
            </motion.div>
          )}

          {/* OAuth Sign In Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, ...SPRING_PRESETS.balanced }}
          >
            <OAuthButtonGroup onSignIn={signIn} loadingProvider={loadingProvider} />
          </motion.div>

          {/* Error Message */}
          {error && <AuthErrorMessage message={error} className="mt-4" />}

          {/* Continue as Guest */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, type: 'spring', stiffness: 280, damping: 26 }}
            className="mt-6 text-center"
          >
            <button
              onClick={onClose}
              className={cn(
                'text-sm hover:underline',
                isDarkMode ? 'text-gray-600 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'
              )}
            >
              {t('auth.firstWin.maybeLater')}
            </button>
          </motion.div>

          {/* Terms */}
          <AuthTermsFooter className="mt-4" />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};

export default FirstWinSignupModal;
