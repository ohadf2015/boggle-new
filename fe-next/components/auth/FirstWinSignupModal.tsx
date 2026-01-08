'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, Medal, Users } from 'lucide-react';
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
  AuthModalCloseButton,
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

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={cn(
            'w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl relative',
            isDarkMode
              ? 'bg-gradient-to-b from-slate-800 via-slate-800 to-slate-900 border border-yellow-500/30'
              : 'bg-gradient-to-b from-white via-white to-gray-50 border border-yellow-400/50'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-b from-yellow-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <AuthModalCloseButton onClose={onClose} className="z-10" />

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
            transition={{ delay: 0.3 }}
            className="text-center mb-6"
          >
            <h2
              className={cn(
                'text-2xl font-bold mb-2',
                isDarkMode
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-400'
                  : 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-600'
              )}
            >
              {isMultiGamesVariant
                ? t('auth.multiGames.title') || "You're Getting Good!"
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
            transition={{ delay: 0.4 }}
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
                  transition={{ delay: 0.5 + index * 0.1 }}
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
              transition={{ delay: 0.6 }}
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
            transition={{ delay: 0.7 }}
          >
            <OAuthButtonGroup onSignIn={signIn} loadingProvider={loadingProvider} />
          </motion.div>

          {/* Error Message */}
          {error && <AuthErrorMessage message={error} className="mt-4" />}

          {/* Continue as Guest */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
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
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default FirstWinSignupModal;
