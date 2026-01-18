import { useEffect, useRef, useCallback } from 'react';

interface UseAutoShowWithInteractionOptions {
  /**
   * Whether the auto-show behavior is enabled
   */
  enabled: boolean;
  /**
   * Minimum delay in milliseconds before the trigger can fire
   */
  delayMs: number;
  /**
   * Callback to execute when both conditions are met:
   * 1. Delay has passed
   * 2. User has interacted with the page
   */
  onTrigger: () => void;
}

/**
 * Hook to auto-show a modal/popup after a delay AND user interaction.
 *
 * Both conditions must be met before triggering:
 * 1. The specified delay has passed
 * 2. The user has interacted with the page (click, scroll, keypress, touch)
 *
 * This ensures the popup doesn't immediately interrupt the user,
 * and only appears when they're actively engaged with the page.
 *
 * @example
 * useAutoShowWithInteraction({
 *   enabled: hasWordsToValidate,
 *   delayMs: 5000,
 *   onTrigger: () => setShowModal(true),
 * });
 */
export function useAutoShowWithInteraction({
  enabled,
  delayMs,
  onTrigger,
}: UseAutoShowWithInteractionOptions): void {
  const hasTriggeredRef = useRef(false);
  const delayPassedRef = useRef(false);
  const userInteractedRef = useRef(false);

  // Check if both conditions are met and trigger
  const checkAndTrigger = useCallback(() => {
    if (
      !hasTriggeredRef.current &&
      delayPassedRef.current &&
      userInteractedRef.current
    ) {
      hasTriggeredRef.current = true;
      onTrigger();
    }
  }, [onTrigger]);

  // Reset state when enabled changes
  useEffect(() => {
    if (!enabled) {
      hasTriggeredRef.current = false;
      delayPassedRef.current = false;
      userInteractedRef.current = false;
    }
  }, [enabled]);

  // Set up delay timer
  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => {
      delayPassedRef.current = true;
      checkAndTrigger();
    }, delayMs);

    return () => clearTimeout(timer);
  }, [enabled, delayMs, checkAndTrigger]);

  // Set up interaction listeners
  useEffect(() => {
    if (!enabled) return;

    const handleInteraction = () => {
      if (!userInteractedRef.current) {
        userInteractedRef.current = true;
        checkAndTrigger();
      }
    };

    // Listen for various user interactions
    window.addEventListener('click', handleInteraction);
    window.addEventListener('scroll', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [enabled, checkAndTrigger]);
}
