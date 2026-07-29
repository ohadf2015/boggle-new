'use client';

import { useDevicePerformance } from '@/hooks/useDevicePerformance';

const FLOATING_LETTERS = [
  { char: 'A', position: 'top-[12%] start-[6%]', color: 'text-neo-lime', delay: '0s', size: 'text-2xl', duration: '7s' },
  { char: 'Z', position: 'top-[22%] end-[8%]', color: 'text-neo-pink', delay: '1.2s', size: 'text-xl', duration: '8s' },
  { char: 'W', position: 'top-[45%] start-[3%]', color: 'text-neo-cyan', delay: '2.5s', size: 'text-lg', duration: '6s' },
  { char: 'Q', position: 'top-[55%] end-[5%]', color: 'text-neo-purple', delay: '3.8s', size: 'text-2xl', duration: '9s' },
  { char: 'X', position: 'bottom-[30%] start-[7%]', color: 'text-neo-pink', delay: '4.5s', size: 'text-base', duration: '7.5s' },
  { char: 'B', position: 'bottom-[18%] end-[6%]', color: 'text-neo-lime', delay: '5.5s', size: 'text-xl', duration: '8.5s' },
];

/**
 * Floating word-game letters at page edges for ambient visual interest.
 * Uses brand letters instead of generic icons to reinforce the word-game identity.
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
      {FLOATING_LETTERS.map(({ char, position, color, delay, size, duration }) => (
        <span
          key={`${char}-${position}`}
          className={`absolute ${position} ${color} ${size} font-neo-display font-black opacity-[0.08] animate-particle-float select-none`}
          style={{ animationDelay: delay, animationDuration: duration }}
        >
          {char}
        </span>
      ))}
    </div>
  );
}
