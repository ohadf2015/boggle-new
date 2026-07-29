/**
 * MultiplayerSignupSheet — Non-intrusive bottom sheet for MP guest signup
 *
 * Slides up from the bottom of the results page showing accumulated stats
 * with protection-framed CTA. Does NOT block interaction with results.
 * Hidden on CrazyGames platform (controlled by parent hook).
 */

'use client';

import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Shield, Trophy, TrendingUp, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { OAuthButtonGroup } from './shared';
import { useOAuthSignIn } from './hooks/useOAuthSignIn';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import type { AccumulatedStats } from '@/hooks/useMultiplayerSignupNudge';

interface MultiplayerSignupSheetProps {
  isOpen: boolean;
  onClose: () => void;
  stats: AccumulatedStats;
  /**
   * Measured height (px) of the fixed StickyReadyBar this sheet must clear.
   * The sheet is a preceding sibling of the container that publishes
   * `--mp-results-cta-h`, so it can't inherit that var — the parent passes
   * the height in directly. 0/undefined → Tailwind fallback class governs the
   * pre-measure frame.
   */
  bottomOffset?: number;
}

// Gap (px) between the sheet's bottom edge and the top of the sticky bar.
const SHEET_BAR_GAP = 8;

export const MultiplayerSignupSheet: React.FC<MultiplayerSignupSheetProps> = ({
  isOpen,
  onClose,
  stats,
  bottomOffset = 0,
}) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const isDarkMode = theme === 'dark';

  const { signIn, loadingProvider, error } = useOAuthSignIn({
    onSuccess: () => {
      trackGrowthEvent('guest_conversion', {
        trigger: 'mp_signup_sheet',
        mpSessionGame: stats.mpGamesThisSession,
        totalWords: stats.totalWords,
        totalScore: stats.totalScore,
      });
    },
  });

  if (isOnCrazyGamesPlatform) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          style={{
            // Sit ABOVE the fixed sticky ready-bar (measured at runtime) so the
            // OAuth buttons never hide behind it. undefined → Tailwind fallback.
            bottom: bottomOffset > 0 ? bottomOffset + SHEET_BAR_GAP : undefined,
            // Never overflow the top of short phones — the inner block scrolls.
            maxHeight:
              bottomOffset > 0
                ? `calc(100dvh - ${bottomOffset + SHEET_BAR_GAP + 12}px)`
                : undefined,
          }}
          className={cn(
            'fixed inset-x-0 z-50 bottom-[calc(9rem+0.5rem)] max-h-[calc(100dvh-11rem)]',
            'flex flex-col rounded-2xl border-3 border-black overflow-hidden',
            'shadow-hard-lg md:max-w-lg md:mx-auto max-w-[calc(100%-1.5rem)] mx-auto',
            isDarkMode ? 'bg-neo-navy-light' : 'bg-white',
          )}
          role="dialog"
          aria-modal="true"
          aria-label={t('auth.mpSignup.title')}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className={cn(
              'w-10 h-1.5 rounded-full',
              isDarkMode ? 'bg-gray-600' : 'bg-gray-300',
            )} />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className={cn(
              'absolute top-3 inset-e-3 p-1.5 rounded-full transition-colors',
              isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-neo-navy-elevated' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
            )}
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>

          <div className="px-5 pb-5 pt-1 max-w-md mx-auto w-full flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {/* Stats summary — the accumulated value at risk. Gold neo panel:
                hard shadow + solid black border = the on-brand "loud" hook. */}
            <div className={cn(
              'flex items-center gap-3 p-3.5 rounded-xl mb-5 border-3 border-black shadow-hard',
              isDarkMode
                ? 'bg-gradient-to-br from-amber-500/25 to-amber-600/10'
                : 'bg-gradient-to-br from-amber-100 to-amber-50',
            )}>
              {/* Shield in a gold chip with a soft pulse to draw the eye */}
              <div className="relative shrink-0">
                <span className="absolute inset-0 rounded-lg bg-neo-yellow/40 animate-ping" aria-hidden />
                <div className="relative flex items-center justify-center w-11 h-11 rounded-lg bg-neo-yellow border-2 border-black shadow-hard-sm">
                  <Shield className="text-neo-black" size={22} strokeWidth={2.5} />
                </div>
              </div>
              <div className="min-w-0">
                <p className={cn(
                  'text-[15px] leading-tight font-black font-neo-display',
                  isDarkMode ? 'text-amber-200' : 'text-amber-800',
                )}>
                  {t('auth.mpSignup.statsAtRisk', {
                    words: stats.totalWords,
                    games: stats.mpGamesThisSession,
                  })}
                </p>
                <p className={cn(
                  'text-xs mt-1',
                  isDarkMode ? 'text-gray-400' : 'text-gray-600',
                )}>
                  {t('auth.mpSignup.statsSubtext')}
                </p>
              </div>
            </div>

            {/* Title + benefits */}
            <h3 className={cn(
              'text-xl font-black font-neo-display mb-3',
              isDarkMode ? 'text-neo-white' : 'text-gray-900',
            )}>
              {t('auth.mpSignup.title')}
            </h3>

            <div className="flex flex-wrap gap-2 mb-5">
              {[
                { icon: Trophy, key: 'auth.mpSignup.benefitLeaderboard', accent: 'text-neo-yellow' },
                { icon: TrendingUp, key: 'auth.mpSignup.benefitProgress', accent: 'text-neo-cyan' },
              ].map(({ icon: Icon, key, accent }) => (
                <div
                  key={key}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-black shadow-hard-sm',
                    isDarkMode ? 'bg-neo-navy' : 'bg-white',
                  )}
                >
                  <Icon size={15} strokeWidth={2.5} className={accent} />
                  <span className={cn(
                    'text-xs font-bold',
                    isDarkMode ? 'text-neo-white' : 'text-gray-800',
                  )}>
                    {t(key)}
                  </span>
                </div>
              ))}
            </div>

            {/* OAuth buttons */}
            <OAuthButtonGroup onSignIn={signIn} loadingProvider={loadingProvider} />

            {error && (
              <p className="text-neo-red text-xs mt-2 text-center">{error}</p>
            )}

            {/* Dismiss */}
            <button
              onClick={onClose}
              className={cn(
                'w-full mt-3 text-center text-xs py-2',
                isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600',
              )}
            >
              {t('auth.firstWin.maybeLater')}
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default MultiplayerSignupSheet;
