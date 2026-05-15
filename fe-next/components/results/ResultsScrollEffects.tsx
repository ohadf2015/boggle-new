'use client';

import React, { useRef, type ReactNode } from 'react';
import { m, useScroll, useTransform, useReducedMotion, type MotionStyle } from 'framer-motion';

interface ParallaxBackdropProps {
  /** Scroll container ref. Required — the page uses an inner scrollable, not window. */
  scrollRef: React.RefObject<HTMLElement | null>;
  /** Translation amplitude (px) the inner layer drifts as the page scrolls. */
  intensity?: number;
}

/**
 * Subtle dual-layer parallax backdrop pinned behind the results content.
 *
 * Sits absolutely inside the page chrome and tracks the inner scroll container
 * (the MP results layout uses overflow-y inside; window scroll wouldn't catch
 * anything). Two layers drift at different rates so depth reads without
 * overwhelming the foreground. Disabled when reduced-motion is requested.
 */
export const ResultsParallaxBackdrop: React.FC<ParallaxBackdropProps> = ({
  scrollRef,
  intensity = 80,
}) => {
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll({ container: scrollRef as React.RefObject<HTMLElement> });

  // Back layer drifts slowly; front layer drifts faster + slight opposite hue.
  const backY = useTransform(scrollY, [0, 600], [0, -intensity * 0.5]);
  const frontY = useTransform(scrollY, [0, 600], [0, -intensity]);
  const auraScale = useTransform(scrollY, [0, 400], [1, 1.08]);

  if (reducedMotion) return null;

  const backStyle: MotionStyle = {
    y: backY,
    background:
      'radial-gradient(circle at 50% 30%, rgba(0,255,255,0.10) 0%, transparent 55%)',
  };
  const frontStyle: MotionStyle = {
    y: frontY,
    scale: auraScale,
    background:
      'radial-gradient(circle at 30% 60%, rgba(255,20,147,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 40%, rgba(191,255,0,0.06) 0%, transparent 50%)',
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      <m.div className="absolute inset-0" style={backStyle} />
      <m.div className="absolute inset-0" style={frontStyle} />
    </div>
  );
};

interface SectionRevealProps {
  children: ReactNode;
  /** Order in the scroll flow — used to vary stagger delay/parallax direction. */
  index?: number;
  className?: string;
  /** Disable the parallax Y drift on this section (default keeps a subtle drift). */
  flat?: boolean;
}

/**
 * Wraps a results section with a one-shot scroll-triggered reveal and a very
 * subtle parallax drift. Sections fade + lift on enter and gently translate as
 * the user keeps scrolling, giving the page depth without per-section work at
 * each callsite.
 */
export const ResultsSectionReveal: React.FC<SectionRevealProps> = ({
  children,
  index = 0,
  className,
  flat = false,
}) => {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Alternate parallax direction so adjacent sections don't drift in lockstep.
  const direction = index % 2 === 0 ? 1 : -1;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const driftRange = flat ? 0 : 14;
  const y = useTransform(scrollYProgress, [0, 1], [driftRange * direction, -driftRange * direction]);

  if (reducedMotion) {
    return <div ref={ref} className={className}>{children}</div>;
  }

  return (
    <m.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: '0px 0px -10% 0px' }}
      transition={{ type: 'spring', stiffness: 140, damping: 22, mass: 0.6 }}
      style={flat ? undefined : { y }}
    >
      {children}
    </m.div>
  );
};

export default ResultsSectionReveal;
