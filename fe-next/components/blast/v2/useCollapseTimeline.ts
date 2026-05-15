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
      // Vertical-only land bounce: squash Y on impact then overshoot, with
      // scaleX held at 1.0. Earlier versions warped X too which read as a
      // horizontal drift during gravity — tiles should stay locked to their
      // column. Stagger 18ms per tile so cascades feel sequenced.
      const startAt = i * 0.018;
      tl.fromTo(
        el,
        { scaleY: 1, scaleX: 1 },
        {
          scaleY: 0.72,
          scaleX: 1,
          duration: 0.11,
          ease: 'power3.in',
          transformOrigin: 'bottom center',
        },
        startAt,
      );
      tl.to(
        el,
        {
          scaleY: 1.08,
          scaleX: 1,
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
          duration: 0.22,
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
