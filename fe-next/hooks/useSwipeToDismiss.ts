import { useCallback, useRef, useState } from 'react';
import { triggerHaptic } from '@/utils/hapticFeedback';

export interface SwipeToDismissOptions {
  onDismiss: () => void;
  threshold?: number;
  direction?: 'down' | 'up' | 'left' | 'right';
  enabled?: boolean;
}

export interface SwipeToDismissState {
  isSwiping: boolean;
  swipeDistance: number;
}

/**
 * useSwipeToDismiss - Hook for swipe-to-dismiss gesture on modals/overlays
 *
 * Features:
 * - Swipe down (or other direction) to dismiss
 * - Visual feedback with drag distance
 * - Haptic feedback on dismiss
 * - Configurable threshold
 *
 * @example
 * const { swipeToDismissHandlers, swipeState } = useSwipeToDismiss({
 *   onDismiss: () => setModalOpen(false),
 *   direction: 'down',
 *   threshold: 100,
 * });
 *
 * <motion.div
 *   {...swipeToDismissHandlers}
 *   style={{ transform: `translateY(${swipeState.swipeDistance}px)` }}
 * >
 *   Modal content
 * </motion.div>
 */
export function useSwipeToDismiss(options: SwipeToDismissOptions) {
  const {
    onDismiss,
    threshold = 100,
    direction = 'down',
    enabled = true,
  } = options;

  const [swipeState, setSwipeState] = useState<SwipeToDismissState>({
    isSwiping: false,
    swipeDistance: 0,
  });

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;

    const touch = e.touches[0];
    if (!touch) return;

    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setSwipeState({ isSwiping: true, swipeDistance: 0 });
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !touchStartRef.current) return;

    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    let distance = 0;
    let shouldPreventDefault = false;

    switch (direction) {
      case 'down':
        if (deltaY > 0) {
          distance = deltaY;
          shouldPreventDefault = true;
        }
        break;
      case 'up':
        if (deltaY < 0) {
          distance = Math.abs(deltaY);
          shouldPreventDefault = true;
        }
        break;
      case 'left':
        if (deltaX < 0) {
          distance = Math.abs(deltaX);
          shouldPreventDefault = true;
        }
        break;
      case 'right':
        if (deltaX > 0) {
          distance = deltaX;
          shouldPreventDefault = true;
        }
        break;
    }

    if (shouldPreventDefault && e.cancelable) {
      e.preventDefault();
    }

    setSwipeState({
      isSwiping: true,
      swipeDistance: distance,
    });
  }, [enabled, direction]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !swipeState.isSwiping) return;

    const shouldDismiss = swipeState.swipeDistance >= threshold;

    if (shouldDismiss) {
      triggerHaptic('medium');
      onDismiss();
    } else {
      // Snap back
      setSwipeState({
        isSwiping: false,
        swipeDistance: 0,
      });
    }

    touchStartRef.current = null;
  }, [enabled, swipeState, threshold, onDismiss]);

  return {
    swipeToDismissHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    swipeState,
    isAtThreshold: swipeState.swipeDistance >= threshold,
  };
}
