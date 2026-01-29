/**
 * useSwipeGesture Hook
 *
 * Swipe gesture detection hook using Framer Motion for flashcard interactions.
 * Provides motion values for drag animations, threshold-based swipe detection,
 * and keyboard shortcuts for accessibility.
 *
 * @example
 * ```tsx
 * const { x, rotate, opacity, handleDragEnd, handleKeyDown } = useSwipeGesture({
 *   onSwipe: (direction) => {
 *     if (direction === 'right') handleGotIt();
 *     else handleDontKnow();
 *   },
 *   threshold: 150,
 * });
 * ```
 */

import { useMotionValue, useTransform, MotionValue } from 'framer-motion';
import { useState, useEffect } from 'react';

export type SwipeDirection = 'left' | 'right';

export interface SwipeConfig {
  /** Callback triggered when swipe threshold is exceeded or keyboard shortcut pressed */
  onSwipe: (direction: SwipeDirection) => void;
  /** Minimum horizontal distance (in px) to trigger swipe. Default: 150 */
  threshold?: number;
  /** Disable all swipe detection */
  disabled?: boolean;
}

interface DragEndInfo {
  offset: { x: number; y: number };
  velocity: { x: number; y: number };
}

export interface UseSwipeGestureReturn {
  /** Motion value for horizontal position */
  x: MotionValue<number>;
  /** Motion value for card rotation (-50deg to +50deg) */
  rotate: MotionValue<number>;
  /** Motion value for card opacity (fades at edges) */
  opacity: MotionValue<number>;
  /** Handler for drag end event from Framer Motion */
  handleDragEnd: (event: any, info: DragEndInfo) => void;
  /** Handler for keyboard shortcuts (ArrowLeft/ArrowRight) */
  handleKeyDown: (event: React.KeyboardEvent) => void;
  /** Current swipe direction based on x position */
  swipeDirection: SwipeDirection | null;
  /** Progress toward threshold (0-1) */
  swipeProgress: number;
}

/**
 * Hook for swipe gesture detection with Framer Motion
 *
 * Features:
 * - Drag-based swipe detection with configurable threshold
 * - Motion values for smooth animations (x, rotate, opacity)
 * - Keyboard shortcuts (ArrowLeft/ArrowRight) for accessibility
 * - Snap-back animation when swipe is insufficient
 * - Disabled state support
 *
 * @param config - Configuration object with onSwipe callback and optional threshold
 * @returns Motion values, handlers, and derived state
 */
export function useSwipeGesture({
  onSwipe,
  threshold = 150,
  disabled = false,
}: SwipeConfig): UseSwipeGestureReturn {
  // Motion value for horizontal drag position
  const x = useMotionValue(0);

  // Transform x position to rotation (-50deg at -300px, +50deg at +300px)
  const rotate = useTransform(x, [-300, 300], [-50, 50]);

  // Transform x position to opacity (fade out at edges)
  const opacity = useTransform(
    x,
    [-threshold * 2, -threshold, 0, threshold, threshold * 2],
    [0.5, 1, 1, 1, 0.5]
  );

  /**
   * Handle drag end event
   * Detects if swipe threshold was crossed, triggers callback or snaps back
   */
  const handleDragEnd = (event: any, info: DragEndInfo) => {
    const swipeDistance = info.offset.x;
    const absDistance = Math.abs(swipeDistance);

    // Check if swipe threshold was met
    if (!disabled && absDistance >= threshold) {
      const direction: SwipeDirection = swipeDistance > 0 ? 'right' : 'left';
      onSwipe(direction);
    } else {
      // Snap back to center
      x.set(0);
    }
  };

  /**
   * Handle keyboard shortcuts for accessibility
   * ArrowRight = swipe right, ArrowLeft = swipe left
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    if (event.key === 'ArrowRight') {
      onSwipe('right');
    } else if (event.key === 'ArrowLeft') {
      onSwipe('left');
    }
  };

  /**
   * Derived swipe direction based on current x position
   * Uses state to react to motion value changes
   */
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection | null>(null);
  const [swipeProgress, setSwipeProgress] = useState<number>(0);

  // Subscribe to x motion value changes
  useEffect(() => {
    const unsubscribe = x.onChange((currentX) => {
      // Update direction
      if (currentX > 0) {
        setSwipeDirection('right');
      } else if (currentX < 0) {
        setSwipeDirection('left');
      } else {
        setSwipeDirection(null);
      }

      // Update progress
      const absX = Math.abs(currentX);
      const progress = absX / threshold;
      setSwipeProgress(Math.min(progress, 1.0));
    });

    return unsubscribe;
  }, [x, threshold]);

  return {
    x,
    rotate,
    opacity,
    handleDragEnd,
    handleKeyDown,
    swipeDirection,
    swipeProgress,
  };
}
