'use client';

/**
 * InlineConfetti — CSS-only confetti burst using react-confetti-explosion.
 *
 * Ultra-lightweight (no canvas), perfect for inline celebrations
 * like achievement unlocks and streak milestones.
 *
 * @example
 * ```tsx
 * {showCelebration && <InlineConfetti />}
 * ```
 */

import { memo } from 'react';
import ConfettiExplosion from 'react-confetti-explosion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

interface InlineConfettiProps {
  /** Size of the explosion area */
  size?: 'sm' | 'md' | 'lg';
  /** Duration in ms */
  duration?: number;
  /** Number of particles */
  particleCount?: number;
  /** Custom colors (defaults to neo-brutalist palette) */
  colors?: string[];
  /** Callback when explosion completes */
  onComplete?: () => void;
}

const NEO_COLORS = ['#BFFF00', '#FF1493', '#00FFFF', '#8B5CF6', '#FFFFFF'];

const SIZE_CONFIG = {
  sm: { force: 0.4, width: 200, particleCount: 20 },
  md: { force: 0.6, width: 400, particleCount: 40 },
  lg: { force: 0.8, width: 600, particleCount: 60 },
} as const;

export const InlineConfetti = memo(function InlineConfetti({
  size = 'md',
  duration = 2200,
  particleCount,
  colors = NEO_COLORS,
  onComplete,
}: InlineConfettiProps) {
  const { isLowEnd, prefersReducedMotion } = useDevicePerformance();

  if (isLowEnd || prefersReducedMotion) return null;

  const config = SIZE_CONFIG[size];

  return (
    <ConfettiExplosion
      force={config.force}
      duration={duration}
      particleCount={particleCount ?? config.particleCount}
      width={config.width}
      colors={colors}
      onComplete={onComplete}
    />
  );
});

export default InlineConfetti;
