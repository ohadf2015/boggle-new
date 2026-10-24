'use client';

import { useEffect, useRef } from 'react';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';

/**
 * Scroll-in for teacher pages: every `[data-tm]` descendant rises into place
 * as it nears the viewport. EducationShell scrolls an inner div, not the
 * window, so ScrollTrigger must be pointed at it. GSAP loads on demand so it
 * stays out of the first bundle; transform + opacity only. `[data-magnet]`
 * elements lean toward a fine pointer and spring back on leave; `[data-tilt]`
 * cards tilt in 3D; `[data-wipe]` headings unmask on mount.
 */
const MAGNET_PX = 8;
const TILT_DEG = 3;

/** `rescan` re-collects targets when async content (a loaded list) mounts after first paint. */
export function useTeacherReveal<T extends HTMLElement>(rescan: string | number | boolean = true) {
  const ref = useRef<T | null>(null);
  const reduced = useEduReducedMotion();

  useEffect(() => {
    const root = ref.current;
    if (!root || reduced) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-tm]'));
    const magnets = Array.from(root.querySelectorAll<HTMLElement>('[data-magnet]'));
    const tilts = Array.from(root.querySelectorAll<HTMLElement>('[data-tilt]'));
    const wipes = Array.from(root.querySelectorAll<HTMLElement>('[data-wipe]'));
    if (targets.length + magnets.length + tilts.length + wipes.length === 0) return;

    let cancelled = false;
    let revert: (() => void) | undefined;
    const offs: Array<() => void> = [];

    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const scroller = root.closest<HTMLElement>('.edu-shell-scroll') ?? undefined;
      const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
      const bind = (el: HTMLElement, move: (dx: number, dy: number) => gsap.TweenVars, rest: gsap.TweenVars) => {
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
          const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
          gsap.to(el, { ...move(dx, dy), duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
        };
        const onLeave = () => gsap.to(el, { ...rest, overwrite: 'auto' });
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerleave', onLeave);
        offs.push(() => {
          el.removeEventListener('pointermove', onMove);
          el.removeEventListener('pointerleave', onLeave);
        });
      };
      if (finePointer) {
        for (const el of magnets) {
          bind(el, (dx, dy) => ({ x: dx * MAGNET_PX, y: dy * MAGNET_PX }), {
            x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)',
          });
        }
        for (const el of tilts) {
          bind(el, (dx, dy) => ({ rotateX: -dy * TILT_DEG, rotateY: dx * TILT_DEG, transformPerspective: 900 }), {
            rotateX: 0, rotateY: 0, duration: 0.6, ease: 'power3.out',
          });
        }
      }
      for (const el of wipes) {
        gsap.fromTo(
          el,
          { clipPath: 'inset(0 0 100% 0)', y: 12 },
          { clipPath: 'inset(0 0 0% 0)', y: 0, duration: 0.6, ease: 'power4.out', clearProps: 'clipPath,transform' },
        );
      }
      if (targets.length === 0) return;
      const ctx = gsap.context(() => {
        gsap.set(targets, { opacity: 0, y: 22 });
        ScrollTrigger.batch(targets, {
          scroller,
          start: 'top 92%',
          once: true,
          interval: 0.08,
          batchMax: 6,
          onEnter: (batch) =>
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration: 0.55,
              ease: 'power3.out',
              stagger: 0.07,
              overwrite: true,
              clearProps: 'transform,opacity',
            }),
        });
      }, root);
      revert = () => ctx.revert();
    });

    return () => {
      cancelled = true;
      offs.forEach((off) => off());
      revert?.();
    };
  }, [reduced, rescan]);

  return ref;
}
