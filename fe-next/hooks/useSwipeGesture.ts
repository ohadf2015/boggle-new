import { useCallback, useRef } from 'react';

export interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  isRtl?: boolean;
  enableHaptic?: boolean;
  hapticIntensity?: number;
}

export interface SwipeGestureHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

/**
 * useSwipeGesture - Reusable hook for swipe gesture detection
 *
 * Features:
 * - Detects horizontal and vertical swipes
 * - RTL language support (reverses horizontal directions)
 * - Configurable threshold
 * - Optional haptic feedback
 * - Works with any component that supports touch events
 *
 * @example
 * const swipeHandlers = useSwipeGesture({
 *   onSwipeLeft: handleNext,
 *   onSwipeRight: handlePrev,
 *   isRtl: dir === 'rtl',
 *   enableHaptic: true,
 * });
 *
 * <div {...swipeHandlers}>Content</div>
 */
export function useSwipeGesture(options: SwipeGestureOptions): SwipeGestureHandlers {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    isRtl = false,
    enableHaptic = true,
    hapticIntensity = 10,
  } = options;

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const triggerHaptic = useCallback(() => {
    if (enableHaptic && window.navigator?.vibrate) {
      window.navigator.vibrate(hapticIntensity);
    }
  }, [enableHaptic, hapticIntensity]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Determine if this is a horizontal or vertical swipe
      if (absDeltaX > absDeltaY && absDeltaX > threshold) {
        // Horizontal swipe
        const isSwipeLeft = deltaX < 0;

        if (isRtl) {
          // RTL: reverse horizontal directions
          if (isSwipeLeft && onSwipeRight) {
            triggerHaptic();
            onSwipeRight();
          } else if (!isSwipeLeft && onSwipeLeft) {
            triggerHaptic();
            onSwipeLeft();
          }
        } else {
          // LTR: normal directions
          if (isSwipeLeft && onSwipeLeft) {
            triggerHaptic();
            onSwipeLeft();
          } else if (!isSwipeLeft && onSwipeRight) {
            triggerHaptic();
            onSwipeRight();
          }
        }
      } else if (absDeltaY > absDeltaX && absDeltaY > threshold) {
        // Vertical swipe
        const isSwipeUp = deltaY < 0;

        if (isSwipeUp && onSwipeUp) {
          triggerHaptic();
          onSwipeUp();
        } else if (!isSwipeUp && onSwipeDown) {
          triggerHaptic();
          onSwipeDown();
        }
      }

      touchStartRef.current = null;
    },
    [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, isRtl, triggerHaptic]
  );

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}
