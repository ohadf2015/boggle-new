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
      // Land thump — a single squash → settle. The previous tuning ended on
      // `back.out(1.4)` which added a bouncy overshoot tail that felt jelly
      // after gravity. Now a clean squash-and-settle with eased-out recovery;
      // no extra bounce keyframe, so the tile reads as a heavy block rather
      // than a rubber ball. Stagger 18ms per tile keeps the cascade cadence.
      const startAt = i * 0.018;
      tl.fromTo(
        el,
        { scaleY: 1, scaleX: 1 },
        {
          scaleY: 0.88,
          scaleX: 1,
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
