'use client';

import { useEffect, useRef, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';

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
  /** Enable slam effect when count completes (scale overshoot + glow) */
  slam?: boolean;
}

/**
 * ScoreCountUp — Animated number counter with ease-out-expo easing.
 *
 * Used across all results pages for the hero score reveal.
 * Respects prefers-reduced-motion. Accessible via aria-label.
 * Optional "slam" effect: bouncy scale overshoot when counter lands.
 */
export function ScoreCountUp({
  from = 0,
  to,
  duration = 1800,
  delay = 0,
  className = '',
  slam = false,
}: ScoreCountUpProps) {
  const [display, setDisplay] = useState(from);
  const [landed, setLanded] = useState(false);
  const prefersReduced = useReducedMotion();
  const rafRef = useRef<number>(0);

  useEffect(() => {
    setLanded(false);
    if (prefersReduced) {
      setDisplay(to);
      setLanded(true);
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
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setLanded(true);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, [to, from, duration, delay, prefersReduced]);

  if (!slam || prefersReduced) {
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

  return (
    <m.span
      className={className}
      aria-label={`Score: ${to}`}
      aria-live="polite"
      animate={landed ? {
        scale: [1.18, 0.95, 1.04, 1],
        filter: [
          'drop-shadow(0 0 0px rgba(191,255,0,0))',
          'drop-shadow(0 0 24px rgba(191,255,0,0.7))',
          'drop-shadow(0 0 10px rgba(191,255,0,0.3))',
          'drop-shadow(0 0 0px rgba(191,255,0,0))',
        ],
      } : { scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 12,
        duration: 0.5,
      }}
    >
      {display.toLocaleString()}
    </m.span>
  );
}
