/**
 * useSignupPrompt - Show signup modal for guests after multiple games
 *
 * Prompts guests to sign up after they've played 2+ games
 * to encourage account creation and persist progress.
 */

import { useEffect, useState } from 'react';
import { getGuestStats } from '@/utils/guestManager';

// Session storage key for tracking if signup prompt was shown
const SIGNUP_PROMPT_SHOWN_KEY = 'boggle_sp_signup_shown';

interface UseSignupPromptParams {
  isAuthenticated: boolean;
  hasUser: boolean;
  authLoading: boolean;
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
}: UseSignupPromptParams): SignupPromptResult {
  const [showSignupModal, setShowSignupModal] = useState(false);

  useEffect(() => {
    // Skip if authenticated, has a user session (profile may still be loading), or auth is still loading
    if (isAuthenticated || hasUser || authLoading) return;
    if (typeof window === 'undefined') return;

    // Check if already shown this session
    const alreadyShown = sessionStorage.getItem(SIGNUP_PROMPT_SHOWN_KEY);
    if (alreadyShown) return;

    // Check if user has played 2+ games total
    const stats = getGuestStats();
    if ((stats.games || 0) < 2) return;

    // Show modal after 3.5 seconds delay
    const timer = setTimeout(() => {
      setShowSignupModal(true);
      sessionStorage.setItem(SIGNUP_PROMPT_SHOWN_KEY, 'true');
    }, 3500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, hasUser, authLoading]);

  return { showSignupModal, setShowSignupModal };
}
