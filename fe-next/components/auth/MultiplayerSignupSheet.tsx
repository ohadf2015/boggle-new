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
}

export const MultiplayerSignupSheet: React.FC<MultiplayerSignupSheetProps> = ({
  isOpen,
  onClose,
  stats,
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
          className={cn(
            'fixed bottom-0 md:bottom-[140px] inset-x-0 z-50 safe-area-bottom',
            'rounded-t-2xl border-t-3 border-x-3 border-black',
            'shadow-hard-lg md:max-w-lg md:mx-auto md:rounded-2xl md:border-3',
            isDarkMode ? 'bg-neo-navy-light' : 'bg-white',
          )}
          role="dialog"
          aria-modal="true"
          aria-label={t('auth.mpSignup.title')}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
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

          <div className="px-5 pb-5 pt-1 max-w-md mx-auto">
            {/* Stats summary — the accumulated value at risk */}
            <div className={cn(
              'flex items-center gap-3 p-3 rounded-xl mb-4 border-2 border-amber-400/30',
              isDarkMode ? 'bg-amber-900/20' : 'bg-amber-50',
            )}>
              <Shield className="text-amber-400 shrink-0" size={24} />
              <div>
                <p className={cn(
                  'text-sm font-bold',
                  isDarkMode ? 'text-amber-300' : 'text-amber-700',
                )}>
                  {t('auth.mpSignup.statsAtRisk', {
                    words: stats.totalWords,
                    games: stats.mpGamesThisSession,
                  })}
                </p>
                <p className={cn(
                  'text-xs mt-0.5',
                  isDarkMode ? 'text-gray-400' : 'text-gray-500',
                )}>
                  {t('auth.mpSignup.statsSubtext')}
                </p>
              </div>
            </div>

            {/* Title + benefits */}
            <h3 className={cn(
              'text-lg font-bold font-neo-display mb-2',
              isDarkMode ? 'text-neo-white' : 'text-gray-900',
            )}>
              {t('auth.mpSignup.title')}
            </h3>

            <div className="flex gap-4 mb-4">
              {[
                { icon: Trophy, key: 'auth.mpSignup.benefitLeaderboard' },
                { icon: TrendingUp, key: 'auth.mpSignup.benefitProgress' },
              ].map(({ icon: Icon, key }) => (
                <div key={key} className="flex items-center gap-1.5">
                  <Icon size={14} className={isDarkMode ? 'text-neo-cyan' : 'text-cyan-600'} />
                  <span className={cn(
                    'text-xs',
                    isDarkMode ? 'text-gray-300' : 'text-gray-600',
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
