import { EDU_DUR, EDU_EASE, EDU_MS } from '@/lib/education/motion/tokens';

export const EDU_MOTION = {
  dur: EDU_DUR,
  ease: EDU_EASE,
  ms: EDU_MS,
  spring: {
    press: { type: 'spring', stiffness: 700, damping: 30, mass: 0.6 },
    pop: { type: 'spring', stiffness: 520, damping: 18 },
    settle: { type: 'spring', stiffness: 260, damping: 26 },
  },
  /** Seconds; the cap keeps a 30-row list from trailing in for seconds. */
  stagger: { step: 0.06, max: 0.6 },
  reveal: { y: 12, scale: 0.96 },
  press: { scale: 0.96 },
} as const;

export function staggerDelay(index: number): number {
  return Math.min(index * EDU_MOTION.stagger.step, EDU_MOTION.stagger.max);
}
