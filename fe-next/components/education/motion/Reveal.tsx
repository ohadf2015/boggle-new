'use client';

import { m } from 'framer-motion';
import { Children, type ReactNode } from 'react';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';
import { EDU_MOTION, staggerDelay } from './tokens';

export interface RevealProps {
  children: ReactNode;
  /** Seconds before this item settles in. */
  delay?: number;
  className?: string;
}

// Transform-only so no opacity layer flashes on mobile; server-rendered content lands static (hydration reads reduced), only post-mount content animates.
export function Reveal({ children, delay = 0, className = '' }: RevealProps) {
  const reduced = useEduReducedMotion();
  // Always m.div: reduced resolves after hydration, and swapping the element type would remount the subtree.
  return (
    <m.div
      data-testid="edu-reveal"
      className={className}
      initial={reduced ? false : { y: EDU_MOTION.reveal.y, scale: EDU_MOTION.reveal.scale }}
      animate={{ y: 0, scale: 1 }}
      transition={reduced ? { duration: 0 } : { ...EDU_MOTION.spring.settle, delay }}
    >
      {children}
    </m.div>
  );
}

export interface StaggerProps {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
}

export function Stagger({ children, className = '', itemClassName = '' }: StaggerProps) {
  return (
    <div className={className}>
      {Children.toArray(children).map((child, i) => (
        <Reveal key={(child as { key?: string }).key ?? i} delay={staggerDelay(i)} className={itemClassName}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
