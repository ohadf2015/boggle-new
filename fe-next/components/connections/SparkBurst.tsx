'use client';

import { m, useReducedMotion } from 'framer-motion';

const COLORS = ['bg-neo-lime', 'bg-neo-yellow', 'bg-neo-cyan', 'bg-neo-pink', 'bg-neo-purple'] as const;
const COUNT = 16;

/**
 * One-shot square-confetti burst from the centre of its parent (the parent
 * must be `relative`). Particles start fully visible and fly outward, so a
 * stalled animation bundle degrades to a few static squares, never a blank
 * area. Deterministic angles/distances keep SSR and hydration identical.
 */
export default function SparkBurst({ distance = 96 }: { distance?: number }) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return null;
  return (
    <span aria-hidden="true" data-testid="spark-burst" className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      {Array.from({ length: COUNT }, (_, i) => {
        const angle = (i / COUNT) * Math.PI * 2 + (i % 2) * 0.2;
        const reach = distance * (0.65 + ((i * 7) % 5) / 10);
        return (
          <m.span
            key={i}
            initial={{ x: 0, y: 0, scale: 1, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * reach,
              y: Math.sin(angle) * reach,
              scale: [1, 1, 0],
              rotate: (i % 2 ? 1 : -1) * 220,
            }}
            transition={{
              x: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
              y: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
              rotate: { duration: 0.9, ease: 'easeOut' },
              scale: { duration: 0.9, times: [0, 0.6, 1], ease: 'linear' },
            }}
            className={`absolute h-2.5 w-2.5 rounded-[2px] border border-neo-black ${COLORS[i % COLORS.length]}`}
          />
        );
      })}
    </span>
  );
}
