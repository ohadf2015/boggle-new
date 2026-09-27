'use client';

/**
 * QuestProgressRing — Animated SVG circular progress indicator.
 * Arc animates from 0 to target on mount using CSS transition.
 * Respects reduced motion via instant transition.
 */

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface QuestProgressRingProps {
  /** 0-1 progress value */
  progress: number;
  /** Size in px */
  size?: number;
  /** Ring stroke width */
  strokeWidth?: number;
  /** Ring color class (Tailwind stroke-* class) */
  color?: string;
  /** Track color */
  trackColor?: string;
  children?: React.ReactNode;
  className?: string;
}

export function QuestProgressRing({
  progress,
  size = 56,
  strokeWidth = 4,
  color = 'stroke-neo-lime',
  trackColor = 'stroke-neo-white/10',
  children,
  className,
}: QuestProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animate from 0 on mount
  const [animatedProgress, setAnimatedProgress] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimatedProgress(progress));
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  const offset = circumference * (1 - Math.min(1, Math.max(0, animatedProgress)));

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={trackColor}
        />
        {/* Progress arc — animates on mount */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn(
            color,
            'transition-[stroke-dashoffset] duration-1000 ease-out',
            'motion-reduce:transition-none',
          )}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {/* Center content */}
      <div className="relative z-10 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
