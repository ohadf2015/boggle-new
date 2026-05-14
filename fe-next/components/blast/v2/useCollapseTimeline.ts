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
      tl.fromTo(
        el,
        { scaleY: 1 },
        {
          scaleY: 0.82,
          duration: 0.09,
          yoyo: true,
          repeat: 1,
          ease: 'power2.in',
          transformOrigin: 'bottom center',
        },
        i * 0.012,
      );
    });
    return () => {
      tl.kill();
    };
  }, [tileIds, boardRef]);
}
