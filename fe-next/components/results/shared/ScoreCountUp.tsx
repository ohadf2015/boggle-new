'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface ScoreCountUpProps {
  /** Starting value (default 0) */
  from?: number;
  /** Target value to count up to */
  to: number;
  /** Animation duration in ms (default 1800) */
  duration?: number;
  /** Delay before animation starts in ms (default 0) */
  delay?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ScoreCountUp — Animated number counter with ease-out-expo easing.
 *
 * Used across all results pages for the hero score reveal.
 * Respects prefers-reduced-motion. Accessible via aria-label.
 */
export function ScoreCountUp({
  from = 0,
  to,
  duration = 1800,
  delay = 0,
  className = '',
}: ScoreCountUpProps) {
  const [display, setDisplay] = useState(from);
  const prefersReduced = useReducedMotion();
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(to);
      return;
    }

    const timeout = setTimeout(() => {
      const start = performance.now();

      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out-expo: fast start, satisfying deceleration
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        setDisplay(Math.round(from + (to - from) * eased));
        if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, [to, from, duration, delay, prefersReduced]);

  return (
    <span
      className={className}
      aria-label={`Score: ${to}`}
      aria-live="polite"
    >
      {display.toLocaleString()}
    </span>
  );
}
