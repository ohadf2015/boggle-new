'use client';

import { useEffect, useRef } from 'react';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';

/**
 * Scroll-in for teacher pages: every `[data-tm]` descendant rises into place
 * as it nears the viewport. EducationShell scrolls an inner div, not the
 * window, so ScrollTrigger must be pointed at it. GSAP loads on demand so it
 * stays out of the first bundle; transform + opacity only. `[data-magnet]`
 * elements lean toward a fine pointer and spring back on leave.
 */
const MAGNET_PX = 8;

/** `rescan` re-collects targets when async content (a loaded list) mounts after first paint. */
export function useTeacherReveal<T extends HTMLElement>(rescan: string | number | boolean = true) {
  const ref = useRef<T | null>(null);
  const reduced = useEduReducedMotion();

  useEffect(() => {
    const root = ref.current;
    if (!root || reduced) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-tm]'));
    const magnets = Array.from(root.querySelectorAll<HTMLElement>('[data-magnet]'));
    if (targets.length === 0 && magnets.length === 0) return;

    let cancelled = false;
    let revert: (() => void) | undefined;
    const offs: Array<() => void> = [];

    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const scroller = root.closest<HTMLElement>('.edu-shell-scroll') ?? undefined;
      const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
      if (finePointer) {
        for (const el of magnets) {
          const pull = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
            const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
            gsap.to(el, { x: dx * MAGNET_PX, y: dy * MAGNET_PX, duration: 0.25, ease: 'power3.out', overwrite: 'auto' });
          };
          const release = () =>
            gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' });
          el.addEventListener('pointermove', pull);
          el.addEventListener('pointerleave', release);
          offs.push(() => {
            el.removeEventListener('pointermove', pull);
            el.removeEventListener('pointerleave', release);
          });
        }
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
