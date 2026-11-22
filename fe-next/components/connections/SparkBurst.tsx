'use client';

import { useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { jitter, lowEndMotion } from '@/lib/animation/variety';

const COLORS = ['bg-neo-lime', 'bg-neo-yellow', 'bg-neo-cyan', 'bg-neo-pink', 'bg-neo-purple', 'bg-neo-orange'] as const;
const COUNT = 16;

const rollBurst = () => ({
  count: lowEndMotion() ? COUNT / 2 : COUNT,
  turn: Math.random() * Math.PI * 2,
  hue: Math.floor(Math.random() * COLORS.length),
  rand: Array.from({ length: COUNT }, () => Math.random()),
});

/**
 * One-shot square-confetti burst from the centre of its parent (the parent
 * must be `relative`). Particles start fully visible and fly outward, so a
 * stalled animation bundle degrades to a few static squares, never a blank
 * area. Mounted only after a solve, so each burst can roll its own rotation, reach and colours.
 */
export default function SparkBurst({ distance = 96 }: { distance?: number }) {
  const reducedMotion = useReducedMotion();
  const [{ count, turn, hue, rand }] = useState(rollBurst);
  if (reducedMotion) return null;
  return (
    <span aria-hidden="true" data-testid="spark-burst" className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + turn;
        const reach = distance * jitter(0.85, 0.2, () => rand[i]);
        return (
          <m.span
            key={i}
            initial={{ x: 0, y: 0, scale: 1, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * reach,
              y: Math.sin(angle) * reach,
              scale: [1, 1, 0],
              rotate: (i % 2 ? 1 : -1) * Math.round(jitter(220, 60, () => rand[i])),
            }}
            transition={{
              x: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
              y: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
              rotate: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
              scale: { duration: 0.9, times: [0, 0.6, 1], ease: 'linear' },
            }}
            className={`absolute h-2.5 w-2.5 rounded-[2px] border border-neo-black ${COLORS[(hue + i) % COLORS.length]}`}
          />
        );
      })}
    </span>
  );
}
