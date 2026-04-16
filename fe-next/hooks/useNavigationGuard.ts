'use client';

import { useEffect, useRef } from 'react';

interface UseNavigationGuardOptions {
  /** Whether navigation should be guarded (typically when game is active) */
  enabled: boolean;
  /** Message to show in native browser dialog (for beforeunload) */
  message?: string;
  /** Callback when user attempts to navigate away - return true to allow, false to block */
  onNavigationAttempt?: () => boolean | void;
}

/**
 * Hook to prevent accidental navigation away from an active game.
 *
 * Handles:
 * - Tab close / page refresh (beforeunload event - shows native browser dialog)
 * - Browser back button (popstate event - triggers callback)
 *
 * @example
 * useNavigationGuard({
 *   enabled: gameActive,
 *   message: 'Are you sure you want to leave? You will lose your progress.',
 *   onNavigationAttempt: () => {
 *     setShowExitConfirm(true);
 *     return false; // Block navigation, let modal handle it
 *   }
 * });
 */
export function useNavigationGuard({
  enabled,
  message = 'Are you sure you want to leave? You will lose your progress in the current game.',
  onNavigationAttempt,
}: UseNavigationGuardOptions): void {
  // Track if we're handling a back navigation
  const isHandlingBackRef = useRef(false);
  // Track the current history state to detect back navigation
  const historyPushedRef = useRef(false);
  // Store callback in ref to avoid effect re-runs when callback reference changes
  const onNavigationAttemptRef = useRef(onNavigationAttempt);

  // Keep the callback ref updated without triggering effects
  useEffect(() => {
    onNavigationAttemptRef.current = onNavigationAttempt;
  });

  // Handle beforeunload (tab close / refresh)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Standard way to trigger browser's native "Leave site?" dialog
      e.preventDefault();
      // Some browsers require returnValue to be set
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, message]);

  // Handle browser back button via popstate
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Push a dummy state to history so we can intercept back button
    if (!historyPushedRef.current) {
      window.history.pushState({ gameGuard: true }, '', window.location.href);
      historyPushedRef.current = true;
    }

    const handlePopState = () => {
      // Prevent rapid-fire handling
      if (isHandlingBackRef.current) return;
      isHandlingBackRef.current = true;

      // Call the navigation attempt handler via ref (always gets latest)
      const shouldAllow = onNavigationAttemptRef.current?.();

      if (shouldAllow !== true) {
        // Block navigation - push state back to keep user on page
        window.history.pushState({ gameGuard: true }, '', window.location.href);
      }

      // Reset handling flag after a brief delay
      setTimeout(() => {
        isHandlingBackRef.current = false;
      }, 100);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Pop the phantom history entry so back button works normally after guard teardown
      if (historyPushedRef.current) {
        window.history.go(-1);
      }
      historyPushedRef.current = false;
    };
  }, [enabled]); // Only re-run when enabled changes, not when callback changes
}

export default useNavigationGuard;
