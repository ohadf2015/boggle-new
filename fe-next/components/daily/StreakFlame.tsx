'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface StreakFlameProps {
  children: React.ReactNode;
  active?: boolean;
  milestone?: boolean;
  className?: string;
}

/**
 * Wraps a streak flame icon with CSS-keyframe flicker + tiny ember particles.
 * Pure CSS; respects prefers-reduced-motion via the global media query.
 */
export function StreakFlame({ children, active = true, milestone = false, className }: StreakFlameProps) {
  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center',
        active && 'streak-flame',
        className
      )}
      aria-hidden="true"
    >
      {children}
      {milestone && active && (
        <>
          <span className="streak-ember" style={{ left: '20%', top: '10%', animationDelay: '0ms' }} />
          <span className="streak-ember" style={{ left: '60%', top: '5%', animationDelay: '200ms' }} />
          <span className="streak-ember" style={{ left: '40%', top: '0%', animationDelay: '450ms' }} />
        </>
      )}
    </span>
  );
}

export default React.memo(StreakFlame);
