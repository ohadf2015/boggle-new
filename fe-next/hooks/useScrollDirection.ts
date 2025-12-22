'use client';

import { useState, useEffect, useRef } from 'react';

type ScrollDirection = 'up' | 'down' | null;

interface UseScrollDirectionOptions {
  /** Minimum scroll delta to trigger direction change (prevents jitter) */
  threshold?: number;
  /** Whether the hook is enabled */
  enabled?: boolean;
}

interface UseScrollDirectionReturn {
  /** Current scroll direction */
  scrollDirection: ScrollDirection;
  /** Current scroll position */
  scrollY: number;
}

/**
 * Hook to detect scroll direction
 * - Tracks whether user is scrolling up or down
 * - Uses threshold to prevent jitter from small scrolls
 * - Optimized with requestAnimationFrame
 */
export function useScrollDirection(
  options: UseScrollDirectionOptions = {}
): UseScrollDirectionReturn {
  const { threshold = 10, enabled = true } = options;

  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(null);
  const [scrollY, setScrollY] = useState(0);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Initialize last scroll position
    lastScrollY.current = window.scrollY;
    setScrollY(window.scrollY);

    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY.current;

      // Only update direction if scroll delta exceeds threshold
      if (Math.abs(scrollDelta) > threshold) {
        const newDirection: ScrollDirection = scrollDelta > 0 ? 'down' : 'up';

        // Only update state if direction actually changed
        setScrollDirection((prev) => prev !== newDirection ? newDirection : prev);
        setScrollY(currentScrollY);
        lastScrollY.current = currentScrollY;
      }

      ticking.current = false;
    };

    const handleScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold, enabled]);

  return { scrollDirection, scrollY };
}

export default useScrollDirection;
