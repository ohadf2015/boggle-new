/**
 * SignupToast — Non-blocking toast nudge for MP guests
 *
 * Shows a brief loss-aversion message before rematch (game 3+).
 * Auto-dismisses after 4 seconds. Does not block any interaction.
 */

'use client';

import React, { useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { cn } from '@/lib/utils';

interface SignupToastProps {
  isVisible: boolean;
  onDismiss: () => void;
  mpGamesThisSession: number;
}

const AUTO_DISMISS_MS = 4000;

export const SignupToast: React.FC<SignupToastProps> = ({
  isVisible,
  onDismiss,
  mpGamesThisSession,
}) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { isOnCrazyGamesPlatform, isLoading: cgLoading } = useCrazyGames();
  const isDarkMode = theme === 'dark';

  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [isVisible, onDismiss]);

  // Suppress while CG SDK environment is still resolving — keeps the signup
  // CTA hidden during the 0–500ms SDK init window even if sync detection misses.
  if (cgLoading || isOnCrazyGamesPlatform) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className={cn(
            'fixed top-4 inset-x-4 z-50 max-w-sm mx-auto',
            'rounded-neo border-3 border-black shadow-hard-sm',
            'flex items-center gap-2.5 px-4 py-3',
            isDarkMode ? 'bg-amber-900/90 backdrop-blur-xs' : 'bg-amber-50 border-amber-300',
          )}
          role="status"
          aria-live="polite"
        >
          <AlertTriangle
            size={18}
            className={isDarkMode ? 'text-amber-400 shrink-0' : 'text-amber-600 shrink-0'}
          />
          <p className={cn(
            'text-sm font-medium',
            isDarkMode ? 'text-amber-200' : 'text-amber-800',
          )}>
            {t('auth.mpSignup.toastStreakWarning', {
              games: mpGamesThisSession,
            })}
          </p>
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default SignupToast;
