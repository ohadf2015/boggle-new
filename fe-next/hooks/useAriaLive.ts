/**
 * useAriaLive - Hook for announcing dynamic content to screen readers
 *
 * Creates and manages an ARIA live region for accessible announcements.
 * Meets WCAG 2.0 AA / Israeli Standard 5568 requirements.
 *
 * @example
 * ```tsx
 * function ScoreCounter({ score }: { score: number }) {
 *   const { announce } = useAriaLive();
 *
 *   useEffect(() => {
 *     announce(`Score updated: ${score} points`);
 *   }, [score, announce]);
 *
 *   return <div>{score}</div>;
 * }
 * ```
 */

import { useCallback, useEffect, useRef } from 'react';

export interface UseAriaLiveOptions {
  /**
   * Politeness level for the live region
   * - 'polite': Waits for user to finish current task (default)
   * - 'assertive': Interrupts immediately (use sparingly)
   */
  politeness?: 'polite' | 'assertive';

  /**
   * Unique ID for the live region (useful when multiple regions needed)
   */
  id?: string;

  /**
   * Delay in ms before clearing the message (allows re-announcements)
   * @default 1000
   */
  clearDelay?: number;
}

export interface UseAriaLiveReturn {
  /**
   * Announce a message to screen readers
   */
  announce: (message: string) => void;

  /**
   * Manually clear the current announcement
   */
  clear: () => void;
}

/**
 * Hook for managing ARIA live region announcements
 */
export function useAriaLive(options: UseAriaLiveOptions = {}): UseAriaLiveReturn {
  const {
    politeness = 'polite',
    id = 'default',
    clearDelay = 1000,
  } = options;

  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create and mount the live region
  useEffect(() => {
    // Create the live region element
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('data-aria-live-region', id);
    liveRegion.setAttribute('aria-live', politeness);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', politeness === 'assertive' ? 'alert' : 'status');
    liveRegion.className = 'sr-only';

    // Append to body
    document.body.appendChild(liveRegion);
    liveRegionRef.current = liveRegion;

    // Cleanup on unmount
    return () => {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
      if (liveRegionRef.current && document.body.contains(liveRegionRef.current)) {
        document.body.removeChild(liveRegionRef.current);
      }
      liveRegionRef.current = null;
    };
  }, [id, politeness]);

  // Clear function - stable reference
  const clear = useCallback(() => {
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = null;
    }
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = '';
    }
  }, []);

  // Announce function - stable reference
  const announce = useCallback((message: string) => {
    if (!liveRegionRef.current) return;

    // Clear any pending clear timeout
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
    }

    // Update the live region content (triggers screen reader announcement)
    liveRegionRef.current.textContent = message;

    // Schedule clearing the message to allow future announcements
    clearTimeoutRef.current = setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = '';
      }
    }, clearDelay);
  }, [clearDelay]);

  return { announce, clear };
}

export default useAriaLive;
