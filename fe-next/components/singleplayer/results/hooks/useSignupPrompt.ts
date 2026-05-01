/**
 * useSignupPrompt - Show signup modal for guests after multiple games
 *
 * Prompts guests to sign up after they've played 2+ games
 * to encourage account creation and persist progress.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getGuestStats } from '@/utils/guestManager';
import { usePostHogFlag } from '@/hooks/usePostHogFlag';
import { trackSignupFunnel } from '@/utils/growthTracking';

// Session storage key for tracking if signup prompt was shown
const SIGNUP_PROMPT_SHOWN_KEY = 'boggle_sp_signup_shown';

interface UseSignupPromptParams {
  isAuthenticated: boolean;
  hasUser: boolean;
  authLoading: boolean;
  disabled?: boolean;
}

interface SignupPromptResult {
  showSignupModal: boolean;
  setShowSignupModal: (show: boolean) => void;
  dismissSignupModal: () => void;
}

/**
 * Hook to manage signup prompt display for guests
 * Shows modal after 2+ games with a delay
 */
export function useSignupPrompt({
  isAuthenticated,
  hasUser,
  authLoading,
  disabled = false,
}: UseSignupPromptParams): SignupPromptResult {
  const [showSignupModal, setShowSignupModal] = useState(false);
  // Capture the variant the prompt was shown under so dismissal/completion
  // events can attribute correctly without re-reading guest stats.
  const shownVariantRef = useRef<{ isFirstWin: boolean } | null>(null);

  // A/B test: 'after-first-win' gates on actual win (with 5-game fallback for non-winners);
  // 'after-third-game' gates purely on games count.
  const signupVariant = usePostHogFlag<string>('show-signup-after-first-win', 'after-first-win');

  useEffect(() => {
    if (disabled || isAuthenticated || hasUser || authLoading) return;
    if (typeof window === 'undefined') return;

    const alreadyShown = sessionStorage.getItem(SIGNUP_PROMPT_SHOWN_KEY);
    if (alreadyShown) return;

    const stats = getGuestStats();
    const games = stats.games || 0;
    const wins = stats.wins || 0;

    // Emotional peak gating: ride the celebration. Fallback ensures non-winners
    // still convert before churning out.
    const qualifies = signupVariant === 'after-third-game'
      ? games >= 3
      : wins >= 1 || games >= 5;

    if (!qualifies) return;

    const isFirstWin = signupVariant !== 'after-third-game' && wins >= 1;

    const timer = setTimeout(() => {
      setShowSignupModal(true);
      sessionStorage.setItem(SIGNUP_PROMPT_SHOWN_KEY, 'true');
      shownVariantRef.current = { isFirstWin };
      trackSignupFunnel('prompt_shown', isFirstWin);
    }, 3500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, hasUser, authLoading, disabled, signupVariant]);

  const dismissSignupModal = useCallback(() => {
    setShowSignupModal(false);
    const shown = shownVariantRef.current;
    if (shown) {
      shownVariantRef.current = null;
      trackSignupFunnel('dismissed', shown.isFirstWin);
    }
  }, []);

  return { showSignupModal, setShowSignupModal, dismissSignupModal };
}
