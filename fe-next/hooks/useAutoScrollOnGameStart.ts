/**
 * useAutoScrollOnGameStart - Auto-scrolls to the game board/timer on game start in portrait mode
 *
 * When the game starts (countdown finishes), automatically scrolls the viewport so the
 * timer and board are visible at the top. This ensures players on mobile in portrait
 * mode can immediately see the game content without manual scrolling.
 *
 * Features:
 * - Only activates in portrait mode (height > width)
 * - Only scrolls on mobile devices (touch support + narrow viewport)
 * - Uses smooth scrolling with a slight offset to show context
 * - Only triggers once per game start
 */

import { useEffect, useRef, type RefObject } from 'react';

interface UseAutoScrollOptions {
  /** Whether the game is currently active (countdown finished) */
  gameActive: boolean;
  /** Whether in landscape mode (skip auto-scroll in landscape) */
  isLandscape: boolean;
  /** Optional: whether the start animation is still showing */
  showStartAnimation?: boolean;
}

/**
 * Hook that auto-scrolls to a target element when the game starts in portrait mode
 *
 * @param targetRef - Ref to the element to scroll into view (e.g., timer/stats section)
 * @param options - Configuration options
 */
export function useAutoScrollOnGameStart(
  targetRef: RefObject<HTMLElement | null>,
  options: UseAutoScrollOptions
): void {
  const { gameActive, isLandscape, showStartAnimation = false } = options;

  // Track if we've already scrolled for this game session
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    // Reset scroll tracking when game becomes inactive
    if (!gameActive) {
      hasScrolledRef.current = false;
      return;
    }

    // Skip if already scrolled, in landscape mode, or animation still showing
    if (hasScrolledRef.current || isLandscape || showStartAnimation) {
      return;
    }

    // Only auto-scroll on mobile devices in portrait mode
    // Check for touch support and narrow viewport
    const isMobilePortrait =
      typeof window !== 'undefined' &&
      window.innerHeight > window.innerWidth && // Portrait orientation
      (window.innerWidth <= 768 || 'ontouchstart' in window); // Mobile width or touch device

    if (!isMobilePortrait) {
      return;
    }

    // Small delay to ensure DOM is ready after animation completes
    const scrollTimer = setTimeout(() => {
      if (targetRef.current && !hasScrolledRef.current) {
        hasScrolledRef.current = true;

        // Scroll the target element into view with a small offset from top
        // Using 'start' alignment positions the element at the top of the viewport
        targetRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }, 100);

    return () => clearTimeout(scrollTimer);
  }, [gameActive, isLandscape, showStartAnimation, targetRef]);
}

export default useAutoScrollOnGameStart;
