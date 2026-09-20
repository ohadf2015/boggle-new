'use client';

/**
 * DismissibleSignupLine — Minimal signup prompt for daily results
 *
 * Shows a single line signup nudge that can be dismissed, replacing the
 * full-bleed DailyChallengeInlineSignup card on the default results scroll path.
 * When dismissed, the state is persisted in localStorage so guests don't see it
 * every day.
 *
 * Tapping opens the full signup card in a modal/bottom sheet.
 */

import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface DismissibleSignupLineProps {
  isVisible: boolean;
  onDismiss: () => void;
  onOpenSignup: () => void;
}

const STORAGE_KEY = 'daily-signup-line-dismissed-v1';

/**
 * Persist dismiss state in localStorage. Returns true if user previously dismissed.
 */
export function isSignupLineDismissedLocally(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

/**
 * Mark the signup line as dismissed in localStorage.
 */
function markSignupLineDismissedLocally(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, 'true');
  }
}

/**
 * Clear the dismissed flag (for testing/resetting).
 */
export function clearSignupLineDismissed(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const DismissibleSignupLine: React.FC<DismissibleSignupLineProps> = ({
  isVisible,
  onDismiss,
  onOpenSignup,
}) => {
  const { t } = useLanguage();

  const handleDismiss = () => {
    markSignupLineDismissedLocally();
    onDismiss();
  };

  const handleOpenSignup = () => {
    onOpenSignup();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex items-center gap-3 w-full p-3 rounded-neo border-2 border-neo-cyan/50 bg-neo-navy-light shadow-hard-sm"
        >
          <button
            onClick={handleOpenSignup}
            className="flex-1 text-start rtl:text-end flex items-center gap-3 hover:gap-4 transition-all"
            aria-label={t('daily.results.signup.title')}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-neo-cyan leading-tight">
                {t('daily.results.signup.shortPrompt')}
              </p>
              <p className="text-xs text-neo-white/70 truncate">
                {t('daily.results.signup.shortSubtitle')}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-neo-cyan shrink-0" />
          </button>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors shrink-0"
            aria-label={t('common.dismiss')}
          >
            <X className="w-3.5 h-3.5 text-neo-white/60 hover:text-neo-white" />
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default DismissibleSignupLine;
