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
      // Vertical-only land thump: deeper squash → stronger overshoot → elastic
      // settle. scaleX is held at 1.0 throughout — earlier versions warped X
      // too which read as horizontal drift during gravity. Tiles must stay
      // locked to their column. Stagger 22ms per tile so cascades feel
      // sequenced like Royal Match's drop cadence.
      const startAt = i * 0.022;
      tl.fromTo(
        el,
        { scaleY: 1, scaleX: 1 },
        {
          scaleY: 0.62,
          scaleX: 1,
          duration: 0.1,
          ease: 'power4.in',
          transformOrigin: 'bottom center',
        },
        startAt,
      );
      tl.to(
        el,
        {
          scaleY: 1.14,
          scaleX: 1,
          duration: 0.13,
          ease: 'power2.out',
        },
        startAt + 0.1,
      );
      tl.to(
        el,
        {
          scaleY: 1,
          scaleX: 1,
          duration: 0.28,
          ease: 'elastic.out(1.4, 0.45)',
        },
        startAt + 0.23,
      );
    });
    return () => {
      tl.kill();
    };
  }, [tileIds, boardRef]);
}
