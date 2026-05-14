'use client';

/**
 * PulseGlow — pulsing glow ring around children
 *
 * Draws attention to active game buttons with a box-shadow pulse.
 * Uses framer-motion for animation. Respects reduced motion.
 */

import { m, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface PulseGlowProps {
  active: boolean;
  /** Glow colour — default neo-pink */
  color?: string;
  children: ReactNode;
  className?: string;
}

const PULSE_TRANSITION = {
  duration: 1.2,
  repeat: Infinity,
  repeatType: 'reverse' as const,
  ease: 'easeInOut' as const,
};

export function PulseGlow({
  active,
  color = '#FF1493',
  children,
  className = '',
}: PulseGlowProps) {
  const shouldReduceMotion = useReducedMotion();

  if (!active) {
    return <>{children}</>;
  }

  return (
    <m.div
      className={`relative inline-block ${className}`}
      animate={{
        boxShadow: shouldReduceMotion
          ? `0 0 0 2px ${color}`
          : [
              `0 0 4px 1px ${color}`,
              `0 0 12px 4px ${color}`,
            ],
      }}
      transition={shouldReduceMotion ? { duration: 0 } : PULSE_TRANSITION}
      style={{ borderRadius: 'inherit' }}
    >
      {children}
    </m.div>
  );
}
