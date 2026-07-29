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
  /**
   * If true, only trigger once per component lifecycle, even if enabled toggles.
   * This prevents re-triggering when parent components re-render.
   * Default: true
   */
  triggerOnce?: boolean;
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
  triggerOnce = true,
}: UseAutoShowWithInteractionOptions): void {
  const hasTriggeredRef = useRef(false);
  const delayPassedRef = useRef(false);
  const userInteractedRef = useRef(false);
  // Persistent ref that survives enabled state changes - prevents popup loop bug
  const hasEverTriggeredRef = useRef(false);

  // Check if both conditions are met and trigger
  const checkAndTrigger = useCallback(() => {
    // If triggerOnce is enabled and we've already triggered, don't trigger again
    if (triggerOnce && hasEverTriggeredRef.current) {
      return;
    }

    if (
      !hasTriggeredRef.current &&
      delayPassedRef.current &&
      userInteractedRef.current
    ) {
      hasTriggeredRef.current = true;
      hasEverTriggeredRef.current = true;
      onTrigger();
    }
  }, [onTrigger, triggerOnce]);

  // Reset state when enabled changes (but NOT hasEverTriggeredRef when triggerOnce is true)
  useEffect(() => {
    if (!enabled) {
      // Only reset hasTriggeredRef if triggerOnce is false
      if (!triggerOnce) {
        hasTriggeredRef.current = false;
      }
      delayPassedRef.current = false;
      userInteractedRef.current = false;
    }
  }, [enabled, triggerOnce]);

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
