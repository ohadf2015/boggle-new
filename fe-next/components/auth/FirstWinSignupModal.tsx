'use client';

import React, { useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, Medal, Users, X } from 'lucide-react';
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
  /**
   * Surface (t_4833c3cd / signup-prompt-friction-v1):
   * - `dialog` — legacy blocking Dialog (control holdout)
   * - `sheet` — non-blocking bottom sheet, value before OAuth (default)
   */
  surface?: 'dialog' | 'sheet';
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
  surface = 'sheet',
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const isDarkMode = theme === 'dark';

  const { signIn, loadingProvider, error } = useOAuthSignIn();

  const guestStats: GuestStats = getGuestStatsSummary();
  const isMultiGamesVariant = variant === 'multiGames';
  const useSheet = surface === 'sheet';

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

  const titleKey = isMultiGamesVariant ? 'auth.multiGames.title' : 'auth.firstWin.title';

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
          particleCount: useSheet ? 80 : 150,
          spread: useSheet ? 70 : 100,
          origin: { y: useSheet ? 0.65 : 0.4 },
          colors: ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#9370DB'],
        });
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, isMultiGamesVariant, useSheet]);

  // Escape dismiss for the non-modal sheet (matches MultiplayerSignupSheet).
  useEffect(() => {
    if (!isOpen || !useSheet || isOnCrazyGamesPlatform) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, useSheet, isOnCrazyGamesPlatform, onClose]);

  if (isOnCrazyGamesPlatform) return null;

  const statsBlock =
    guestStats && guestStats.gamesPlayed > 0 ? (
      <div
        className={cn(
          'p-3 rounded-xl text-center text-sm border-2 border-black shadow-hard-sm',
          isDarkMode
            ? 'bg-cyan-900/30 border-cyan-500/40'
            : 'bg-cyan-50 border-cyan-200',
        )}
      >
        <span className={isDarkMode ? 'text-cyan-300' : 'text-cyan-700'}>
          {t('auth.firstWin.statsTeaser', {
            games: guestStats.gamesPlayed,
            score: guestStats.totalScore,
          })}
        </span>
      </div>
    ) : null;

  const benefitChips = (
    <div className="flex flex-wrap gap-2">
      {benefits.map((benefit) => (
        <div
          key={benefit.translationKey}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 border-black shadow-hard-sm text-xs font-bold',
            isDarkMode ? 'bg-neo-navy text-neo-white' : 'bg-white text-gray-800',
          )}
        >
          <benefit.icon
            className={cn('shrink-0', isDarkMode ? 'text-cyan-400' : 'text-cyan-600')}
            size={14}
          />
          <span>{t(benefit.translationKey)}</span>
        </div>
      ))}
    </div>
  );

  const oauthBlock = (
    <>
      <OAuthButtonGroup onSignIn={signIn} loadingProvider={loadingProvider} />
      {error && <AuthErrorMessage message={error} className="mt-3" />}
    </>
  );

  // ── Soft sheet (default / treatment) — non-blocking, value before auth ──
  if (useSheet) {
    return (
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={cn(
              'fixed inset-x-0 bottom-3 z-50 max-h-[min(70dvh,28rem)]',
              'flex flex-col rounded-2xl border-3 border-black overflow-hidden',
              'shadow-hard-lg md:max-w-lg md:mx-auto max-w-[calc(100%-1.5rem)] mx-auto',
              isDarkMode ? 'bg-neo-navy-light' : 'bg-white',
            )}
            role="region"
            aria-label={t(titleKey)}
            data-testid="first-win-signup-sheet"
            data-variant={variant}
            data-surface="sheet"
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div
                className={cn(
                  'w-10 h-1.5 rounded-full',
                  isDarkMode ? 'bg-gray-600' : 'bg-gray-300',
                )}
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              className={cn(
                'absolute top-3 inset-e-3 p-1.5 rounded-full transition-colors',
                isDarkMode
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-neo-navy-elevated'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
              )}
              aria-label={t('common.close')}
            >
              <X size={18} />
            </button>

            <div className="px-5 pb-5 pt-1 max-w-md mx-auto w-full flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4">
              {/* Value first: stats at risk, then short title/CTA copy */}
              {statsBlock}

              <div className="flex items-start gap-3">
                {!isMultiGamesVariant && (
                  <Trophy
                    className="text-yellow-500 shrink-0 mt-0.5 drop-shadow-[0_0_12px_rgb(234_179_8/0.45)]"
                    size={36}
                    aria-hidden
                  />
                )}
                <div className="min-w-0">
                  <h2
                    className={cn(
                      'text-xl font-black font-neo-display leading-tight',
                      isDarkMode ? 'text-neo-lime' : 'text-gray-900',
                    )}
                  >
                    {t(titleKey)}
                  </h2>
                  <p
                    className={cn(
                      'text-sm mt-1 leading-snug',
                      isDarkMode ? 'text-gray-300' : 'text-gray-600',
                    )}
                  >
                    {t(subtitleKey)}
                  </p>
                  <p
                    className={cn(
                      'text-xs mt-1.5 font-semibold',
                      isDarkMode ? 'text-amber-200/90' : 'text-amber-800',
                    )}
                  >
                    {t('auth.firstWin.quickSave')}
                  </p>
                </div>
              </div>

              {benefitChips}

              {oauthBlock}

              <div className="text-center">
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    'text-sm hover:underline',
                    isDarkMode
                      ? 'text-gray-500 hover:text-gray-300'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  {t('auth.firstWin.maybeLater')}
                </button>
              </div>

              <AuthTermsFooter className="mt-1" />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    );
  }

  // ── Legacy blocking Dialog (control holdout) ──
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        noDescription
        data-testid="first-win-signup-modal"
        data-variant={variant}
        data-surface="dialog"
        className={cn(
          'max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl',
          isDarkMode
            ? 'bg-neo-navy border border-yellow-500/30'
            : 'bg-white border border-yellow-400/50',
        )}
      >
        <DialogHeader variant="gradient" customBg="bg-transparent" className="border-b-0 p-0">
          <DialogTitle className="sr-only">{t(titleKey)}</DialogTitle>
        </DialogHeader>

        <DialogBody className="relative p-6 pt-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-linear-to-b from-yellow-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />

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

          <Reveal className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2 text-neo-lime">{t(titleKey)}</h2>
            <p className={cn('text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-600')}>
              {t(subtitleKey)}
            </p>
          </Reveal>

          {/* Value before the OAuth wall even on the control Dialog */}
          {statsBlock && <Reveal className="mb-4">{statsBlock}</Reveal>}

          <Reveal
            className={cn('mb-6 p-4 rounded-xl', isDarkMode ? 'bg-neo-navy-elevated/50' : 'bg-gray-50')}
          >
            <p
              className={cn(
                'text-sm font-medium mb-3',
                isDarkMode ? 'text-gray-300' : 'text-gray-600',
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
                    isDarkMode ? 'text-gray-200' : 'text-gray-700',
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

          <Reveal>{oauthBlock}</Reveal>

          <Reveal className="mt-6 text-center">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'text-sm hover:underline',
                isDarkMode
                  ? 'text-gray-600 hover:text-gray-300'
                  : 'text-gray-600 hover:text-gray-700',
              )}
            >
              {t('auth.firstWin.maybeLater')}
            </button>
          </Reveal>

          <AuthTermsFooter className="mt-4" />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};

export default FirstWinSignupModal;
