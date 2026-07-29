'use client';

/**
 * useGameGestures — game-specific gesture hooks wrapping @use-gesture/react.
 *
 * Provides reusable gesture patterns for tile swiping, board zoom,
 * and word-forming drag with velocity tracking.
 * Opt-in — consumers bind the returned handlers to their DOM elements.
 *
 * @example
 * ```tsx
 * const { bindSwipe } = useSwipeTiles({
 *   onSwipe: (dir) => console.log('swiped', dir),
 * });
 * <div {...bindSwipe()} />
 * ```
 */

import { useCallback, useRef } from 'react';
import { useDrag, usePinch, useGesture } from '@use-gesture/react';

// ─── Types ──────────────────────────────────────────────────────────────

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

interface SwipeTilesOptions {
  /** Called when a swipe gesture completes */
  onSwipe: (direction: SwipeDirection, velocity: number) => void;
  /** Minimum velocity to register as swipe (default 0.3) */
  threshold?: number;
}

interface PinchZoomOptions {
  /** Called with scale delta during pinch */
  onZoom: (scale: number) => void;
  /** Min scale (default 0.5) */
  minScale?: number;
  /** Max scale (default 3) */
  maxScale?: number;
}

interface DragWordOptions {
  /** Called with current position during drag */
  onDrag: (x: number, y: number, velocity: number) => void;
  /** Called when drag starts */
  onDragStart?: (x: number, y: number) => void;
  /** Called when drag ends */
  onDragEnd?: (x: number, y: number, velocity: number) => void;
}

// ─── Swipe Hook ─────────────────────────────────────────────────────────

/**
 * Detect swipe gestures on a game board — ideal for tile-based navigation.
 */
export function useSwipeTiles({ onSwipe, threshold = 0.3 }: SwipeTilesOptions) {
  const bindSwipe = useDrag(
    ({ swipe: [sx, sy], velocity: [vx, vy], direction: [dx, dy], last }) => {
      if (!last) return;

      const speed = Math.max(vx, vy);
      if (speed < threshold && sx === 0 && sy === 0) return;

      // Determine direction from swipe or fallback to direction vector
      if (sx !== 0 || sy !== 0) {
        if (sx === 1) onSwipe('right', vx);
        else if (sx === -1) onSwipe('left', vx);
        else if (sy === 1) onSwipe('down', vy);
        else if (sy === -1) onSwipe('up', vy);
      } else if (speed >= threshold) {
        if (Math.abs(dx) > Math.abs(dy)) {
          onSwipe(dx > 0 ? 'right' : 'left', vx);
        } else {
          onSwipe(dy > 0 ? 'down' : 'up', vy);
        }
      }
    },
    {
      axis: undefined,
      swipe: { distance: 30, velocity: threshold },
      filterTaps: true,
    },
  );

  return { bindSwipe };
}

// ─── Pinch Zoom Hook ────────────────────────────────────────────────────

/**
 * Pinch-to-zoom on the game board — great for mobile.
 */
export function usePinchZoom({ onZoom, minScale = 0.5, maxScale = 3 }: PinchZoomOptions) {
  const scaleRef = useRef(1);

  const bindPinch = usePinch(
    ({ offset: [scale], memo }) => {
      const clamped = Math.max(minScale, Math.min(maxScale, scale));
      scaleRef.current = clamped;
      onZoom(clamped);
      return memo;
    },
    {
      scaleBounds: { min: minScale, max: maxScale },
      rubberband: true,
    },
  );

  const resetZoom = useCallback(() => {
    scaleRef.current = 1;
    onZoom(1);
  }, [onZoom]);

  return { bindPinch, resetZoom, scaleRef };
}

// ─── Drag Word Hook ─────────────────────────────────────────────────────

/**
 * Enhanced word-forming drag with velocity tracking.
 * Tracks finger/mouse position with velocity data for adaptive feedback.
 */
export function useDragWord({ onDrag, onDragStart, onDragEnd }: DragWordOptions) {
  const bindDrag = useDrag(
    ({ xy: [x, y], velocity: [vx, vy], first, last }) => {
      const speed = Math.sqrt(vx * vx + vy * vy);

      if (first) {
        onDragStart?.(x, y);
      }

      if (last) {
        onDragEnd?.(x, y, speed);
        return;
      }

      onDrag(x, y, speed);
    },
    {
      filterTaps: true,
      delay: 0,
    },
  );

  return { bindDrag };
}

// ─── Combined Gesture Hook ──────────────────────────────────────────────

interface CombinedGestureOptions {
  onDrag?: DragWordOptions['onDrag'];
  onDragStart?: DragWordOptions['onDragStart'];
  onDragEnd?: DragWordOptions['onDragEnd'];
  onPinch?: PinchZoomOptions['onZoom'];
  pinchBounds?: { min: number; max: number };
}

/**
 * Combined gesture handler for drag + pinch on the same element.
 * Uses useGesture to avoid conflicts between gesture recognizers.
 */
export function useCombinedGestures({
  onDrag,
  onDragStart,
  onDragEnd,
  onPinch,
  pinchBounds = { min: 0.5, max: 3 },
}: CombinedGestureOptions) {
  const bind = useGesture(
    {
      onDrag: ({ xy: [x, y], velocity: [vx, vy], first, last }) => {
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (first) onDragStart?.(x, y);
        if (last) { onDragEnd?.(x, y, speed); return; }
        onDrag?.(x, y, speed);
      },
      onPinch: ({ offset: [scale] }) => {
        const clamped = Math.max(pinchBounds.min, Math.min(pinchBounds.max, scale));
        onPinch?.(clamped);
      },
    },
    {
      drag: { filterTaps: true, delay: 0 },
      pinch: { scaleBounds: pinchBounds, rubberband: true },
    },
  );

  return { bind };
}
