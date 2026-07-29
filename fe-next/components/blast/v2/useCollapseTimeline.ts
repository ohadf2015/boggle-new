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
      // Land thump — squash → settle with proper squash-AND-STRETCH: as the
      // tile compresses vertically it bulges horizontally (volume conservation),
      // so the landing reads as a real WEIGHTY impact instead of just getting
      // shorter. Kept subtle (5% bulge) so tiles never overlap neighbours, and
      // still no spring overshoot tail (the previous `back.out(1.4)` felt jelly)
      // — a heavy block, not a rubber ball. Stagger 18ms per tile keeps cadence.
      const startAt = i * 0.018;
      tl.fromTo(
        el,
        { scaleY: 1, scaleX: 1 },
        {
          scaleY: 0.86,
          scaleX: 1.05,
          duration: 0.07,
          ease: 'power3.in',
          transformOrigin: 'bottom center',
        },
        startAt,
      );
      tl.to(
        el,
        {
          scaleY: 1,
          scaleX: 1,
          duration: 0.18,
          ease: 'power2.out',
        },
        startAt + 0.07,
      );
    });
    return () => {
      tl.kill();
    };
  }, [tileIds, boardRef]);
}
