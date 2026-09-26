'use client';

import { useEffect, useRef, useState } from 'react';

export interface FloorPop {
  isActive: boolean;
  delta: number;
  shouldAnimate: boolean;
}

/**
 * Triggers a pop animation when heightM increases (floor built).
 * Does NOT animate on mount or when height decreases (floor lost).
 *
 * - isActive: true when the animation should be shown (immediate visual feedback)
 * - delta: height increase (Nm) for "+Nm" display
 * - shouldAnimate: true when animation CSS classes should be applied (false on mount, respects reducedMotion)
 */
export function useFloorPop(heightM: number, reducedMotion?: boolean): FloorPop {
  const prevHeightRef = useRef<number | null>(null);
  const [popState, setPopState] = useState<{ isActive: boolean; delta: number }>({ isActive: false, delta: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prevHeight = prevHeightRef.current;

    if (prevHeight === null) {
      // First render: just track the height, don't animate
      prevHeightRef.current = heightM;
      return;
    }

    const delta = heightM - prevHeight;

    // Only animate on increase (floor built), not on decrease (floor lost)
    if (delta > 0.01) {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Show the pop for 600ms (generous for the animation to complete)
      setPopState({ isActive: true, delta });
      timeoutRef.current = setTimeout(() => {
        setPopState((prev) => ({ ...prev, isActive: false }));
        timeoutRef.current = null;
      }, 600);
    }

    prevHeightRef.current = heightM;
  }, [heightM]);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isActive: popState.isActive,
    delta: popState.delta,
    shouldAnimate: popState.isActive && !reducedMotion,
  };
}
