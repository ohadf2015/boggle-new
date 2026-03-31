/**
 * useSignupPrompt - Show signup modal for guests after multiple games
 *
 * Prompts guests to sign up after they've played 2+ games
 * to encourage account creation and persist progress.
 */

import { useEffect, useState } from 'react';
import { getGuestStats } from '@/utils/guestManager';
import { usePostHogFlag } from '@/hooks/usePostHogFlag';

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

  // A/B test: show signup after first win vs after 3rd game
  // 'after-first-win' = show after 1 game, 'after-third-game' = show after 3 games
  const signupVariant = usePostHogFlag<string>('show-signup-after-first-win', 'after-first-win');
  const gameThreshold = signupVariant === 'after-third-game' ? 3 : 2;

  useEffect(() => {
    // Skip if disabled, authenticated, has a user session (profile may still be loading), or auth is still loading
    if (disabled || isAuthenticated || hasUser || authLoading) return;
    if (typeof window === 'undefined') return;

    // Check if already shown this session
    const alreadyShown = sessionStorage.getItem(SIGNUP_PROMPT_SHOWN_KEY);
    if (alreadyShown) return;

    // Check if user has played enough games (controlled by feature flag)
    const stats = getGuestStats();
    if ((stats.games || 0) < gameThreshold) return;

    // Show modal after 3.5 seconds delay
    const timer = setTimeout(() => {
      setShowSignupModal(true);
      sessionStorage.setItem(SIGNUP_PROMPT_SHOWN_KEY, 'true');
    }, 3500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, hasUser, authLoading, disabled, gameThreshold]);

  return { showSignupModal, setShowSignupModal };
}
