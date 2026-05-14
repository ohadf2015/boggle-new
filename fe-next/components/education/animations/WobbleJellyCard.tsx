'use client';

/**
 * WobbleJellyCard — spring-physics squish on hover
 *
 * Low damping (8) creates organic oscillation that gradually settles,
 * mimicking a soft rubbery material. Respects prefers-reduced-motion.
 * Drops inline styles in favour of className — caller owns visual styling.
 */

import { m, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

// stiffness 200 + damping 8 = maximum jelly feel with controlled overshoot
const JELLY_SPRING = { type: 'spring' as const, stiffness: 200, damping: 8 };

interface WobbleJellyCardProps {
  children: ReactNode;
  className?: string;
  /** Override hover scale. Default: squish scaleX 1.05, scaleY 0.95 */
  hoverScale?: { scaleX: number; scaleY: number };
  disabled?: boolean;
}

export function WobbleJellyCard({
  children,
  className = '',
  hoverScale = { scaleX: 1.05, scaleY: 0.95 },
  disabled = false,
}: WobbleJellyCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <m.div
      whileHover={
        disabled || shouldReduceMotion
          ? { opacity: 0.9 }
          : hoverScale
      }
      whileTap={
        disabled || shouldReduceMotion
          ? {}
          : { scaleX: 0.97, scaleY: 1.03 }
      }
      transition={shouldReduceMotion ? { duration: 0.15 } : JELLY_SPRING}
      className={className}
    >
      {children}
    </m.div>
  );
}
