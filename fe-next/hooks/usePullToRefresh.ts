import { useCallback, useRef, useState, useEffect } from 'react';
import { triggerHaptic } from '@/utils/hapticFeedback';

export interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPullDistance?: number;
  resistance?: number;
  enabled?: boolean;
}

export interface PullToRefreshState {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
}

/**
 * Get the current scroll position, checking element scroll first, then window scroll
 */
function getScrollTop(element: HTMLElement | null, scrollableParent: HTMLElement | null): number {
  // First check if we have a scrollable element
  if (scrollableParent) {
    return scrollableParent.scrollTop;
  }

  // Check the direct element
  if (element && element.scrollTop !== undefined && element.scrollTop > 0) {
    return element.scrollTop;
  }

  // Fallback to window scroll
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

/**
 * Find the nearest scrollable parent element
 */
function findScrollableParent(element: HTMLElement | null): HTMLElement | null {
  if (!element) return null;

  let current: HTMLElement | null = element;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;

    if (overflowY === 'auto' || overflowY === 'scroll') {
      if (current.scrollHeight > current.clientHeight) {
        return current;
      }
    }

    current = current.parentElement;
  }

  return null;
}

/**
 * usePullToRefresh - Hook for pull-to-refresh functionality
 *
 * Features:
 * - Native iOS-style pull-to-refresh
 * - Works with both window scroll and element scroll
 * - Configurable threshold and resistance
 * - Haptic feedback on trigger
 *
 * @example
 * const { pullToRefreshHandlers, pullState } = usePullToRefresh({
 *   onRefresh: async () => {
 *     await fetchNewData();
 *   },
 *   threshold: 80,
 * });
 *
 * <div {...pullToRefreshHandlers}>
 *   {pullState.isRefreshing && <Spinner />}
 *   Content...
 * </div>
 */
export function usePullToRefresh(options: PullToRefreshOptions) {
  const {
    onRefresh,
    threshold = 80,
    maxPullDistance = 120,
    resistance = 2.5,
    enabled = true,
  } = options;

  const [pullState, setPullState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
  });

  const touchStartRef = useRef<{ y: number; scrollTop: number; canPull: boolean } | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const isRefreshingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || isRefreshingRef.current) return;

    // Use target instead of currentTarget to find the actual element being touched
    // This allows finding nested scrollable elements
    const target = e.target as HTMLElement;
    containerRef.current = e.currentTarget as HTMLElement;

    const touch = e.touches[0];
    if (!touch) return;

    // Find scrollable parent and get scroll position
    const scrollableParent = findScrollableParent(target);
    const scrollTop = getScrollTop(target, scrollableParent);

    // Allow pull-to-refresh if at the top (with small tolerance for rounding)
    const canPull = scrollTop <= 1;

    touchStartRef.current = {
      y: touch.clientY,
      scrollTop,
      canPull,
    };
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !touchStartRef.current || isRefreshingRef.current) return;

    const touch = e.touches[0];
    if (!touch) return;

    const deltaY = touch.clientY - touchStartRef.current.y;

    // Re-check scroll position on each move (user might have scrolled)
    // Use target from event which persists from touchstart
    const target = e.target as HTMLElement;
    const scrollableParent = findScrollableParent(target);
    const currentScrollTop = getScrollTop(target, scrollableParent);

    // Only pull down when at top of scroll and pulling down
    if (deltaY > 10 && currentScrollTop <= 1) {
      // Note: we rely on CSS overscroll-behavior-y:contain on the scroll
      // container (.screen-fit) instead of e.preventDefault() so that
      // touch listeners stay passive and don't block compositor scrolling.

      // Apply resistance to make it feel natural
      const pullDistance = Math.min(
        (deltaY - 10) / resistance,
        maxPullDistance
      );

      setPullState({
        isPulling: true,
        pullDistance,
        isRefreshing: false,
      });

      // Trigger light haptic when reaching threshold
      if (pullDistance >= threshold && touchStartRef.current.canPull) {
        touchStartRef.current.canPull = false; // Only trigger once per pull
        triggerHaptic('light');
      }
    } else if (deltaY <= 0 || currentScrollTop > 1) {
      // Reset if scrolling up or not at top
      if (pullState.isPulling) {
        setPullState({
          isPulling: false,
          pullDistance: 0,
          isRefreshing: false,
        });
      }
    }
  }, [enabled, maxPullDistance, resistance, threshold, pullState.isPulling]);

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !pullState.isPulling || isRefreshingRef.current) return;

    const shouldRefresh = pullState.pullDistance >= threshold;

    if (shouldRefresh) {
      // Trigger haptic feedback
      triggerHaptic('medium');
      isRefreshingRef.current = true;

      setPullState({
        isPulling: false,
        pullDistance: threshold,
        isRefreshing: true,
      });

      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull-to-refresh error:', error);
        triggerHaptic('error');
      } finally {
        isRefreshingRef.current = false;
        setPullState({
          isPulling: false,
          pullDistance: 0,
          isRefreshing: false,
        });
      }
    } else {
      // Snap back to initial position
      setPullState({
        isPulling: false,
        pullDistance: 0,
        isRefreshing: false,
      });
    }

    touchStartRef.current = null;
  }, [enabled, pullState, threshold, onRefresh]);

  // Also handle touch cancel (e.g., when a gesture is interrupted)
  const handleTouchCancel = useCallback(() => {
    if (pullState.isPulling) {
      setPullState({
        isPulling: false,
        pullDistance: 0,
        isRefreshing: false,
      });
    }
    touchStartRef.current = null;
  }, [pullState.isPulling]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      touchStartRef.current = null;
      isRefreshingRef.current = false;
    };
  }, []);

  return {
    pullToRefreshHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    pullState,
    isAtThreshold: pullState.pullDistance >= threshold,
  };
}
