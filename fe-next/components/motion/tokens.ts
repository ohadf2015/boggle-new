import type { Transition } from 'framer-motion';

export const MOTION = {
  press: { duration: 0.08, ease: 'easeOut' },
  pop: { type: 'spring', stiffness: 520, damping: 24, mass: 0.8 },
  settle: { type: 'spring', stiffness: 300, damping: 32 },
  fill: { type: 'spring', stiffness: 140, damping: 22 },
} as const satisfies Record<string, Transition>;

export const STAGGER_STEP = 0.06;
