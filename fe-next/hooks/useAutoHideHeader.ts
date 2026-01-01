'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutoHideHeaderOptions {
  /** Threshold in pixels before hiding begins (default: 50) */
  threshold?: number;
  /** Delay in ms before hiding after scroll stops (default: 0) */
  hideDelay?: number;
  /** Whether the feature is enabled (default: true) */
  enabled?: boolean;
  /** Force hide regardless of scroll (e.g., during gameplay) */
  forceHide?: boolean;
  /** Force show regardless of scroll (e.g., on landing page) */
  forceShow?: boolean;
}

interface UseAutoHideHeaderReturn {
  /** Whether the header should be visible */
  isVisible: boolean;
  /** Current scroll position */
  scrollY: number;
  /** Scroll direction: 'up' | 'down' | null */
  scrollDirection: 'up' | 'down' | null;
  /** Manually show the header */
  show: () => void;
  /** Manually hide the header */
  hide: () => void;
}

/**
 * useAutoHideHeader - Controls header visibility based on scroll behavior
 *
 * Behavior:
 * - Header shows when scrolling UP (user wants to navigate)
 * - Header hides when scrolling DOWN (user is reading content)
 * - Header always shows at top of page
 * - Can be force-hidden during gameplay to maximize screen space
 *
 * Usage:
 * ```tsx
 * const { isVisible } = useAutoHideHeader({ forceHide: isGameActive });
 *
 * return (
 *   <header className={cn(
 *     'transition-transform duration-200',
 *     isVisible ? 'translate-y-0' : '-translate-y-full'
 *   )}>
 *     ...
 *   </header>
 * );
 * ```
 */
export function useAutoHideHeader(options?: UseAutoHideHeaderOptions): UseAutoHideHeaderReturn {
  const {
    threshold = 50,
    hideDelay = 0,
    enabled = true,
    forceHide = false,
    forceShow = false,
  } = options || {};

  const [isVisible, setIsVisible] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);

  const lastScrollY = useRef(0);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticking = useRef(false);

  // Manual controls
  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);

  useEffect(() => {
    // Handle force states
    if (forceHide) {
      setIsVisible(false);
      return;
    }
    if (forceShow) {
      setIsVisible(true);
      return;
    }

    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const handleScroll = () => {
      if (ticking.current) return;

      ticking.current = true;
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const direction = currentScrollY > lastScrollY.current ? 'down' : 'up';

        setScrollY(currentScrollY);
        setScrollDirection(direction);

        // Clear any pending hide timeout
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }

        // Always show at top of page
        if (currentScrollY < threshold) {
          setIsVisible(true);
        }
        // Scrolling up - show header
        else if (direction === 'up') {
          setIsVisible(true);
        }
        // Scrolling down - hide header (with optional delay)
        else if (direction === 'down' && currentScrollY > threshold) {
          if (hideDelay > 0) {
            hideTimeoutRef.current = setTimeout(() => {
              setIsVisible(false);
            }, hideDelay);
          } else {
            setIsVisible(false);
          }
        }

        lastScrollY.current = currentScrollY;
        ticking.current = false;
      });
    };

    // Set initial scroll position
    lastScrollY.current = window.scrollY;
    setScrollY(window.scrollY);

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [enabled, forceHide, forceShow, threshold, hideDelay]);

  return {
    isVisible,
    scrollY,
    scrollDirection,
    show,
    hide,
  };
}

export default useAutoHideHeader;
