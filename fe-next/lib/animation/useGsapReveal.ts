'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { isReducedMotionPreferred } from '@/utils/accessibility';

interface RevealOptions {
  /** CSS selector for children to stagger-reveal. If omitted, reveals the container itself. */
  selector?: string;
  /** Initial Y offset in px. */
  y?: number;
  /** Initial scale. */
  scale?: number;
  /** Per-child stagger in seconds. */
  stagger?: number;
  /** Animation duration in seconds. */
  duration?: number;
  /** Delay before the timeline starts. */
  delay?: number;
  /** Easing curve. */
  ease?: string;
  /** Observer threshold (0–1). */
  threshold?: number;
  /** When true, animation runs once and never reverses. */
  once?: boolean;
}

/**
 * Reveal a container (and optionally its children) when it enters the viewport,
 * using GSAP for the actual animation. Respects prefers-reduced-motion by
 * snapping to the final state without animating. Pattern mirrors useScrollReveal
 * but with GSAP timelines for richer easing + stagger control.
 */
export function useGsapReveal<T extends HTMLElement>(opts: RevealOptions = {}) {
  const ref = useRef<T | null>(null);
  const {
    selector,
    y = 24,
    scale,
    stagger = 0.08,
    duration = 0.6,
    delay = 0,
    ease = 'power3.out',
    threshold = 0.15,
    once = true,
  } = opts;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets: Element[] = selector
      ? Array.from(el.querySelectorAll(selector))
      : [el];
    if (targets.length === 0) return;

    const rm = isReducedMotionPreferred();
    const from: gsap.TweenVars = rm
      ? { opacity: 0 }
      : { opacity: 0, y, ...(scale !== undefined ? { scale } : {}) };
    const to: gsap.TweenVars = rm
      ? { opacity: 1, duration: 0.2, ease: 'none', stagger: 0 }
      : { opacity: 1, y: 0, scale: 1, duration, ease, stagger, delay };

    gsap.set(targets, from);

    let played = false;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !played) {
          played = true;
          gsap.to(targets, to);
          if (once) obs.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -10% 0px' },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [selector, y, scale, stagger, duration, delay, ease, threshold, once]);

  return ref;
}
