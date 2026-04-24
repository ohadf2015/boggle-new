'use client';

import { useDevicePerformance } from '@/hooks/useDevicePerformance';

const CONFETTI_COLORS = [
  'bg-neo-lime',
  'bg-neo-pink',
  'bg-neo-cyan',
  'bg-neo-orange',
  'bg-neo-lime',
  'bg-neo-pink',
  'bg-neo-cyan',
  'bg-neo-orange',
];

const CONFETTI_ITEMS = CONFETTI_COLORS.map((color, i) => ({
  color,
  left: `${10 + i * 12}%`,
  delay: `${i * 0.7}s`,
  duration: `${3 + (i % 3)}s`,
  size: i % 2 === 0 ? 'w-2 h-2' : 'w-1.5 h-1.5',
  rotate: i % 2 === 0 ? 'rotate-45' : 'rotate-12',
}));

/**
 * CSS-only ambient confetti particles for the daily landing page.
 * Disabled on low-end devices and when user prefers reduced motion.
 */
export function ConfettiBackground() {
  const { isLowEnd, prefersReducedMotion } = useDevicePerformance();

  if (isLowEnd || prefersReducedMotion) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
      data-testid="confetti-background"
    >
      {CONFETTI_ITEMS.map((item) => (
        <div
          key={`${item.left}-${item.delay}-${item.color}`}
          className={`absolute ${item.size} ${item.color} ${item.rotate} opacity-20 rounded-sm`}
          style={{
            left: item.left,
            top: '-8px',
            animation: `confetti-fall ${item.duration} linear ${item.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}
