'use client';

import React, { useRef, type ReactNode } from 'react';
import {
  m,
  useScroll,
  useTransform,
  useSpring,
  useVelocity,
  useReducedMotion,
  type MotionStyle,
} from 'framer-motion';

interface ParallaxBackdropProps {
  /** Scroll container ref. Required — the page uses an inner scrollable, not window. */
  scrollRef: React.RefObject<HTMLElement | null>;
  /** Translation amplitude (px) the inner layer drifts as the page scrolls. */
  intensity?: number;
}

/**
 * Multi-layer parallax backdrop pinned behind the results content.
 *
 * Sits absolutely inside the page chrome and tracks the inner scroll container
 * (the MP results layout uses overflow-y inside; window scroll wouldn't catch
 * anything). Three layers drift at different rates so depth reads cleanly:
 *   - Back: slowest, cyan aura
 *   - Mid:  hue-shifting magenta+lime nebula, gently scales with depth
 *   - Front: scroll-velocity-driven highlight, springs into view on fast flicks
 * Disabled when reduced-motion is requested.
 */
export const ResultsParallaxBackdrop: React.FC<ParallaxBackdropProps> = ({
  scrollRef,
  intensity = 80,
}) => {
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll({ container: scrollRef as React.RefObject<HTMLElement> });

  // Back layer drifts slowly; mid layer drifts faster + slight opposite hue.
  const backY = useTransform(scrollY, [0, 600], [0, -intensity * 0.5]);
  const midY = useTransform(scrollY, [0, 600], [0, -intensity]);
  const auraScale = useTransform(scrollY, [0, 400], [1, 1.08]);

  // Hue rotation on the mid layer — gives the page a subtle dynamic color
  // shift as the player scrolls without breaking the neo palette.
  const hueShift = useTransform(scrollY, [0, 800], [0, 18]);
  const midFilter = useTransform(hueShift, (h) => `hue-rotate(${h}deg)`);

  // Velocity-driven highlight layer — flickers in on fast scroll flicks,
  // settles out on rest. Spring-smoothed so it never strobes.
  const velocity = useVelocity(scrollY);
  const smoothedVelocity = useSpring(velocity, { stiffness: 100, damping: 30, mass: 0.4 });
  const velocityOpacity = useTransform(smoothedVelocity, [-2000, 0, 2000], [0.18, 0, 0.18]);
  const velocityY = useTransform(smoothedVelocity, [-2000, 0, 2000], [40, 0, -40]);

  if (reducedMotion) return null;

  const backStyle: MotionStyle = {
    y: backY,
    background:
      'radial-gradient(circle at 50% 30%, rgba(0,255,255,0.10) 0%, transparent 55%)',
  };
  const midStyle: MotionStyle = {
    y: midY,
    scale: auraScale,
    filter: midFilter,
    background:
      'radial-gradient(circle at 30% 60%, rgba(255,20,147,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 40%, rgba(191,255,0,0.06) 0%, transparent 50%)',
  };
  const velocityStyle: MotionStyle = {
    y: velocityY,
    opacity: velocityOpacity,
    background:
      'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.10) 0%, transparent 60%)',
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      <m.div className="absolute inset-0" style={backStyle} />
      <m.div className="absolute inset-0" style={midStyle} />
      <m.div className="absolute inset-0" style={velocityStyle} />
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

interface HeroTiltProps {
  children: ReactNode;
  /** Scroll container ref — same one fed to ResultsParallaxBackdrop. */
  scrollRef: React.RefObject<HTMLElement | null>;
  className?: string;
}

/**
 * Gentle 3D tilt + lift applied to the cinematic hero block as the user
 * scrolls down. Translates a tiny amount upward, scales down 4%, and rotates
 * 6° on X — giving the top section a "leaning back" feel as new content
 * scrolls in below. No-ops under reduced-motion.
 */
export const ResultsHeroTilt: React.FC<HeroTiltProps> = ({
  children,
  scrollRef,
  className,
}) => {
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll({ container: scrollRef as React.RefObject<HTMLElement> });
  const rotateX = useTransform(scrollY, [0, 400], [0, 6]);
  const scale = useTransform(scrollY, [0, 400], [1, 0.96]);
  const opacity = useTransform(scrollY, [0, 200, 500], [1, 1, 0.85]);

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      className={className}
      style={{
        rotateX,
        scale,
        opacity,
        transformPerspective: 1000,
        transformOrigin: 'top center',
        willChange: 'transform',
      }}
    >
      {children}
    </m.div>
  );
};

interface ScrollProgressRailProps {
  /** Scroll container to track. Same ref passed to ResultsParallaxBackdrop. */
  scrollRef: React.RefObject<HTMLElement | null>;
  /** Hide on mobile breakpoints (avoids clashing with the sticky ready bar). */
  hideOnMobile?: boolean;
}

/**
 * Electric scroll progress rail — vertical 3px lime→cyan→pink gradient pinned to
 * the inline-end edge (right in LTR, left in RTL). Height tracks
 * `scrollYProgress` of the inner scroll container; spring-smoothed so the rail
 * settles tactilely without jitter on touch-momentum scrolls.
 *
 * Neo-brutalist hard-shadow styling. Hidden under reduced-motion since the rail
 * IS the motion — a static partial rail would look broken.
 */
export const ResultsScrollProgressRail: React.FC<ScrollProgressRailProps> = ({
  scrollRef,
  hideOnMobile = true,
}) => {
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ container: scrollRef as React.RefObject<HTMLElement> });
  const smoothed = useSpring(scrollYProgress, { stiffness: 220, damping: 30, mass: 0.4 });
  const height = useTransform(smoothed, [0, 1], ['0%', '100%']);

  if (reducedMotion) return null;

  return (
    <m.div
      aria-hidden
      className={`${hideOnMobile ? 'hidden md:block' : 'block'} absolute top-0 rtl:left-1 ltr:right-1 w-[3px] z-30 pointer-events-none rounded-full will-change-[height]`}
      style={{
        height,
        background:
          'linear-gradient(180deg, var(--neo-lime, #BFFF00) 0%, var(--neo-cyan, #00FFFF) 50%, var(--neo-pink, #FF1493) 100%)',
        boxShadow: '1px 1px 0 var(--neo-black, #000)',
      }}
    />
  );
};

export default ResultsSectionReveal;
