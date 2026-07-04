/**
 * useSignupPrompt - Show signup modal for guests ONLY post-game
 *
 * Prompts guests to sign up after completing at least 1 game
 * and only surfaces the modal on results screens, never pre-game.
 * Gate: 1+ games completed (ensures first-game is done before prompt).
 * Variant via PostHog flag: after-first-win (1 win minimum) or after-third-game (3 games minimum).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getGuestStats } from '@/utils/guestManager';
import { usePostHogFlag } from '@/hooks/usePostHogFlag';
import { useConsentDecided } from '@/hooks/useConsentDecided';
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
  /** True when the prompt qualifies as a first-win celebration (winner emotional peak). */
  isFirstWin: boolean;
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
  const [isFirstWin, setIsFirstWin] = useState(false);
  // Bump on `guestStatsChanged` window event so the gate re-evaluates when a
  // game updates localStorage. SignupPromptHost mounts once at the provider;
  // without this, stats read at 0/0 on app boot and never re-check.
  const [statsVersion, setStatsVersion] = useState(0);
  // Capture the variant the prompt was shown under so dismissal/completion
  // events can attribute correctly without re-reading guest stats.
  const shownVariantRef = useRef<{ isFirstWin: boolean } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onChange = () => setStatsVersion((v) => v + 1);
    window.addEventListener('guestStatsChanged', onChange);
    return () => window.removeEventListener('guestStatsChanged', onChange);
  }, []);

  // A/B test: 'after-first-win' gates on actual win (with 5-game fallback for non-winners);
  // 'after-third-game' gates purely on games count.
  const signupVariant = usePostHogFlag<string>('show-signup-after-first-win', 'after-first-win');

  // Hold the prompt until the cookie-consent decision is resolved. The consent banner
  // (z-110, no backdrop) would otherwise sit on top of this modal (z-90), so the modal
  // pops up *behind* it and gets revealed when the user clicks Decline/Accept.
  const consentDecided = useConsentDecided();

  useEffect(() => {
    if (disabled || isAuthenticated || hasUser || authLoading) return;
    if (typeof window === 'undefined') return;
    if (!consentDecided) return;

    const alreadyShown = sessionStorage.getItem(SIGNUP_PROMPT_SHOWN_KEY);
    if (alreadyShown) return;

    const stats = getGuestStats();
    const games = stats.games || 0;
    const wins = stats.wins || 0;

    // MANDATORY GATE: Never show before first game is completed.
    // This ensures the signup flow only appears post-game, not during gameplay or pre-game lobbies.
    if (games < 1) return;

    // Post-first-game threshold: based on variant and emotional peak strategy.
    // after-third-game: fires at 3+ games (consistent, predictable)
    // after-first-win (default): fires at 1+ win, or 5+ games as fallback for non-winners
    const qualifies = signupVariant === 'after-third-game'
      ? games >= 3
      : wins >= 1 || games >= 5;

    if (!qualifies) return;

    const qualifiesAsFirstWin = signupVariant !== 'after-third-game' && wins >= 1;

    const timer = setTimeout(() => {
      setIsFirstWin(qualifiesAsFirstWin);
      setShowSignupModal(true);
      sessionStorage.setItem(SIGNUP_PROMPT_SHOWN_KEY, 'true');
      shownVariantRef.current = { isFirstWin: qualifiesAsFirstWin };
      trackSignupFunnel('prompt_shown', qualifiesAsFirstWin);
    }, 3500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, hasUser, authLoading, disabled, signupVariant, statsVersion, consentDecided]);

  const dismissSignupModal = useCallback(() => {
    setShowSignupModal(false);
    const shown = shownVariantRef.current;
    if (shown) {
      shownVariantRef.current = null;
      trackSignupFunnel('dismissed', shown.isFirstWin);
    }
  }, []);

  return { showSignupModal, setShowSignupModal, dismissSignupModal, isFirstWin };
}
