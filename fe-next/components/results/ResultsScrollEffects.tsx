'use client';

import React, { useRef, useEffect, useState, type ReactNode } from 'react';
import {
  m,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

function useIsSmallViewport(): boolean {
  const [isSmall, setIsSmall] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const sync = () => setIsSmall(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return isSmall;
}

interface ParallaxBackdropProps {
  scrollRef: React.RefObject<HTMLElement | null>;
  intensity?: number;
}

/**
 * GSAP-driven parallax backdrop. ScrollTrigger batches transform updates
 * onto GSAP's shared RAF ticker — measurably smoother than framer-motion's
 * per-MotionValue subscriptions during iOS momentum scroll.
 *
 * Mobile: 0.55x intensity, drops the velocity flicker layer (paint cost).
 * Desktop: full intensity + velocity-driven highlight on fast flicks.
 */
export const ResultsParallaxBackdrop: React.FC<ParallaxBackdropProps> = ({
  scrollRef,
  intensity = 140,
}) => {
  const reducedMotion = useReducedMotion();
  const isSmall = useIsSmallViewport();
  const backRef = useRef<HTMLDivElement | null>(null);
  const midRef = useRef<HTMLDivElement | null>(null);
  const flickRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const scroller = scrollRef.current;
    const back = backRef.current;
    const mid = midRef.current;
    if (!scroller || !back || !mid) return;

    const mult = isSmall ? 0.55 : 1;
    const scrub = isSmall ? 0.6 : 0.4;

    const mkScrub = (target: HTMLElement, y: number) =>
      gsap.to(target, {
        y,
        ease: 'none',
        scrollTrigger: {
          scroller,
          trigger: scroller,
          start: 'top top',
          end: 'bottom top',
          scrub,
          invalidateOnRefresh: true,
        },
      });

    const tweens: gsap.core.Tween[] = [
      mkScrub(back, -intensity * 0.5 * mult),
      mkScrub(mid, -intensity * mult),
    ];

    let cleanupFlick: (() => void) | undefined;
    const flick = flickRef.current;
    if (!isSmall && flick) {
      gsap.set(flick, { opacity: 0, y: 0 });
      let lastY = scroller.scrollTop;
      let lastT = performance.now();
      let raf = 0;
      const onScroll = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const now = performance.now();
          const dt = Math.max(16, now - lastT);
          const dy = scroller.scrollTop - lastY;
          const v = (dy / dt) * 1000;
          lastY = scroller.scrollTop;
          lastT = now;
          gsap.to(flick, {
            opacity: Math.min(0.18, Math.abs(v) / 2000),
            y: gsap.utils.clamp(-40, 40, -v / 50),
            duration: 0.4,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        });
      };
      scroller.addEventListener('scroll', onScroll, { passive: true });
      cleanupFlick = () => {
        scroller.removeEventListener('scroll', onScroll);
        if (raf) cancelAnimationFrame(raf);
      };
    }

    return () => {
      cleanupFlick?.();
      tweens.forEach((tw) => {
        tw.scrollTrigger?.kill();
        tw.kill();
      });
    };
  }, [scrollRef, intensity, isSmall, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      <div
        ref={backRef}
        className="absolute inset-0 will-change-transform"
        style={{
          background:
            'radial-gradient(circle at 50% 30%, rgba(0,255,255,0.10) 0%, transparent 55%)',
          transform: 'translate3d(0,0,0)',
        }}
      />
      <div
        ref={midRef}
        className="absolute inset-0 will-change-transform"
        style={{
          background:
            'radial-gradient(circle at 30% 60%, rgba(255,20,147,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 40%, rgba(191,255,0,0.06) 0%, transparent 50%)',
          transform: 'translate3d(0,0,0)',
        }}
      />
      {!isSmall && (
        <div
          ref={flickRef}
          className="absolute inset-0 will-change-transform"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.10) 0%, transparent 60%)',
          }}
        />
      )}
    </div>
  );
};

interface SectionRevealProps {
  children: ReactNode;
  index?: number;
  className?: string;
  /** Kept for callsite API compat; per-section scroll drift removed. */
  flat?: boolean;
}

/**
 * Entrance-only reveal — Jackbox-style sticker drop. Adjacent sections
 * shuffle in from opposite sides with a tiny rotate kick that springs to
 * zero. No scroll-coupled drift: that made adjacent cards drift opposite
 * directions while the user was trying to read, hurting readability on
 * mobile.
 */
export const ResultsSectionReveal: React.FC<SectionRevealProps> = ({
  children,
  index = 0,
  className,
}) => {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  if (reducedMotion) {
    return <div ref={ref} className={className}>{children}</div>;
  }

  const xFrom = index % 2 === 0 ? -10 : 10;
  const rotateFrom = index % 2 === 0 ? -1.2 : 1.2;
  const stagger = Math.min(index * 0.035, 0.18);

  return (
    <m.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 22, x: xFrom, rotate: rotateFrom }}
      whileInView={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.15, margin: '0px 0px -8% 0px' }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        mass: 0.55,
        delay: stagger,
      }}
    >
      {children}
    </m.div>
  );
};

interface HeroTiltProps {
  children: ReactNode;
  scrollRef: React.RefObject<HTMLElement | null>;
  className?: string;
}

/**
 * Hero wrapper — was rotateX + scale + opacity-dim, which distorted the
 * podium and washed out the leaderboard. Now flat with a GSAP-scrubbed
 * -8px lift over the first 400px of scroll so the hero still feels alive
 * without warping content.
 */
export const ResultsHeroTilt: React.FC<HeroTiltProps> = ({
  children,
  scrollRef,
  className,
}) => {
  const reducedMotion = useReducedMotion();
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const scroller = scrollRef.current;
    const target = innerRef.current;
    if (!scroller || !target) return;
    const tw = gsap.to(target, {
      y: -8,
      ease: 'none',
      scrollTrigger: {
        scroller,
        trigger: scroller,
        start: 'top top',
        end: '+=400',
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    });
    return () => {
      tw.scrollTrigger?.kill();
      tw.kill();
    };
  }, [scrollRef, reducedMotion]);

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={innerRef}
      className={className}
      style={{
        transformOrigin: 'top center',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
};

interface ScrollProgressRailProps {
  scrollRef: React.RefObject<HTMLElement | null>;
  hideOnMobile?: boolean;
}

/**
 * Vertical scroll progress rail. Framer's single MotionValue->CSS-height
 * path is the simplest and cheapest tool here — the visual *is* motion,
 * so swapping to GSAP wouldn't gain anything.
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
