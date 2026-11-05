'use client';

import { m } from 'framer-motion';
import type { ReactNode } from 'react';
import { EDU_MOTION, useReducedMotionSafe } from '@/components/education/motion';

const RISE_PX = 28;

// Transform-only scroll entrance: a big section never sits behind an opacity layer, so mobile cannot flash it.
export function EducationLandingReveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotionSafe();
  return (
    <m.div
      data-testid="edu-landing-reveal"
      className={className}
      initial={reduced ? false : { y: RISE_PX }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={reduced ? { duration: 0 } : EDU_MOTION.spring.settle}
    >
      {children}
    </m.div>
  );
}

export default EducationLandingReveal;
