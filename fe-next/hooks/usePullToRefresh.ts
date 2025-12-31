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
 * usePullToRefresh - Hook for pull-to-refresh functionality
 *
 * Features:
 * - Native iOS-style pull-to-refresh
 * - Configurable threshold and resistance
 * - Haptic feedback on trigger
 * - Works with scrollable containers
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

  const touchStartRef = useRef<{ y: number; scrollTop: number } | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;

    const target = e.currentTarget as HTMLElement;
    containerRef.current = target;

    const touch = e.touches[0];
    if (!touch) return;

    // Only start pull-to-refresh if scrolled to top
    if (target.scrollTop === 0) {
      touchStartRef.current = {
        y: touch.clientY,
        scrollTop: target.scrollTop,
      };
    }
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !touchStartRef.current) return;

    const touch = e.touches[0];
    if (!touch) return;

    const target = e.currentTarget as HTMLElement;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Only pull down when at top of scroll
    if (deltaY > 0 && target.scrollTop === 0) {
      // Prevent default scroll behavior while pulling
      if (e.cancelable) {
        e.preventDefault();
      }

      // Apply resistance to make it feel natural
      const pullDistance = Math.min(
        deltaY / resistance,
        maxPullDistance
      );

      setPullState({
        isPulling: true,
        pullDistance,
        isRefreshing: false,
      });
    }
  }, [enabled, maxPullDistance, resistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !pullState.isPulling) return;

    const shouldRefresh = pullState.pullDistance >= threshold;

    if (shouldRefresh) {
      // Trigger haptic feedback
      triggerHaptic('medium');

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

  // Clean up on unmount
  useEffect(() => {
    return () => {
      touchStartRef.current = null;
    };
  }, []);

  return {
    pullToRefreshHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    pullState,
    isAtThreshold: pullState.pullDistance >= threshold,
  };
}
