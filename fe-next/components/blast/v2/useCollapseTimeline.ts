import { useEffect, useRef } from 'react';
import gsap from 'gsap';

function reducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Plays a squash-on-land GSAP punch on tiles after a collapse (when tileIds
 * changes). Framer Motion's `layout` handles the positional slide; this adds
 * the landing punch. No-ops on first render and when reduced motion is set.
 */
export function useCollapseTimeline(
  boardRef: React.RefObject<HTMLElement | null>,
  tileIds: string[][] | undefined,
): void {
  const prev = useRef<string | null>(null);

  useEffect(() => {
    const key = JSON.stringify(tileIds ?? []);
    if (prev.current === null) {
      prev.current = key;
      return;
    }
    if (prev.current === key) return;
    prev.current = key;
    if (reducedMotion() || !boardRef.current) return;

    const tiles = boardRef.current.querySelectorAll<HTMLElement>('[data-cell-id]');
    const tl = gsap.timeline();
    tiles.forEach((el, i) => {
      // Land-bounce two-phase: hard squash to 0.66 (anticipation of landing
      // weight) → snap-back overshoot to 1.06 → settle at 1.0. Reads as the
      // tile having mass. Stagger 18ms per tile so cascades feel sequenced.
      const startAt = i * 0.018;
      tl.fromTo(
        el,
        { scaleY: 1, scaleX: 1 },
        {
          scaleY: 0.66,
          scaleX: 1.18,
          duration: 0.11,
          ease: 'power3.in',
          transformOrigin: 'bottom center',
        },
        startAt,
      );
      tl.to(
        el,
        {
          scaleY: 1.06,
          scaleX: 0.94,
          duration: 0.12,
          ease: 'power2.out',
        },
        startAt + 0.11,
      );
      tl.to(
        el,
        {
          scaleY: 1,
          scaleX: 1,
          duration: 0.18,
          ease: 'elastic.out(1.2, 0.5)',
        },
        startAt + 0.23,
      );
    });
    return () => {
      tl.kill();
    };
  }, [tileIds, boardRef]);
}
