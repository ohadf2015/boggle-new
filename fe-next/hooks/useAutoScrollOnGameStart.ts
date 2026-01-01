/**
 * useAutoScrollOnGameStart - Auto-scrolls to show timer AND board on game start in portrait mode
 *
 * When the game starts (countdown finishes), automatically scrolls the viewport so BOTH the
 * timer and the game board are fully visible. This ensures players on mobile in portrait
 * mode can immediately see all game content without manual scrolling.
 *
 * Features:
 * - Only activates in portrait mode (height > width)
 * - Only scrolls on mobile devices (touch support + narrow viewport)
 * - Calculates optimal scroll position to show timer + board completely
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
 * Hook that auto-scrolls to show both timer and board when the game starts in portrait mode
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

        // Get the stats row position
        const targetRect = targetRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // Find the grid element by its specific class name
        // The game board uses 'game-board-frame' or 'game-board-frame-landscape' class
        const gridElement = document.querySelector('.game-board-frame') ||
                           document.querySelector('.game-board-frame-landscape');

        // Calculate the total game area height (stats + word area + grid)
        // We want to scroll so both timer (top) and board (below) are visible
        let gameAreaHeight = 0;

        if (gridElement) {
          const gridRect = gridElement.getBoundingClientRect();
          // Calculate from top of stats to bottom of grid
          gameAreaHeight = (gridRect.bottom - targetRect.top);
        } else {
          // Fallback: estimate grid height as roughly 60% of viewport for mobile portrait
          gameAreaHeight = viewportHeight * 0.75;
        }

        // Calculate optimal scroll position
        // We want the stats row at the top with a small offset (8px padding)
        // But if the game area is taller than viewport, prioritize showing the grid
        const topOffset = 8; // Small padding from top
        const currentScrollY = window.scrollY;
        const targetTop = targetRect.top + currentScrollY;

        let scrollToY: number;

        if (gameAreaHeight <= viewportHeight - topOffset) {
          // Game area fits in viewport - scroll stats to top with offset
          scrollToY = targetTop - topOffset;
        } else {
          // Game area taller than viewport - scroll to show more of the grid
          // Position so the bottom of the grid is at the bottom of viewport
          // This naturally shows the timer at top and grid filling the rest
          const gridBottom = gridElement
            ? gridElement.getBoundingClientRect().bottom + currentScrollY
            : targetTop + gameAreaHeight;

          // Scroll so grid bottom aligns with viewport bottom (with safe area)
          const safeAreaBottom = parseInt(
            getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0'
          ) || 16;

          scrollToY = gridBottom - viewportHeight + safeAreaBottom;

          // But ensure stats row is still visible at top
          const statsMinVisible = targetTop - topOffset;
          if (scrollToY > statsMinVisible) {
            scrollToY = statsMinVisible;
          }
        }

        // Ensure we don't scroll to negative
        scrollToY = Math.max(0, scrollToY);

        window.scrollTo({
          top: scrollToY,
          behavior: 'smooth',
        });
      }
    }, 150); // Slightly longer delay to ensure grid is rendered

    return () => clearTimeout(scrollTimer);
  }, [gameActive, isLandscape, showStartAnimation, targetRef]);
}

export default useAutoScrollOnGameStart;
