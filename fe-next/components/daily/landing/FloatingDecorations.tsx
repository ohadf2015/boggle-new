'use client';

import { Star, Zap, Type, Sparkles } from 'lucide-react';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

const DECORATIONS = [
  { Icon: Star, position: 'top-20 inset-s-4', delay: '0s' },
  { Icon: Zap, position: 'top-40 inset-e-6', delay: '1.5s' },
  { Icon: Type, position: 'bottom-40 inset-s-8', delay: '3s' },
  { Icon: Sparkles, position: 'bottom-20 inset-e-4', delay: '4.5s' },
];

/**
 * Floating decorative icons at page edges for ambient visual interest.
 * Disabled on low-end devices and when user prefers reduced motion.
 */
export function FloatingDecorations() {
  const { isLowEnd, prefersReducedMotion } = useDevicePerformance();

  if (isLowEnd || prefersReducedMotion) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
      data-testid="floating-decorations"
    >
      {DECORATIONS.map(({ Icon, position, delay }, i) => (
        <Icon
          key={i}
          className={`absolute ${position} w-6 h-6 text-white opacity-[0.15] animate-particle-float`}
          style={{ animationDelay: delay, animationDuration: '6s' }}
        />
      ))}
    </div>
  );
}
