import { useEffect, useRef } from 'react';
import gsap from 'gsap';

function reducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Fires a quick choreographed shake on the board whenever invalidShakeKey
 * changes (other than initial mount). Subtle red border flash via filter for
 * extra "no" feedback without coupling to CSS class state. Skipped under
 * prefers-reduced-motion.
 */
export function useInvalidShake(
  boardRef: React.RefObject<HTMLElement | null>,
  invalidShakeKey: number,
): void {
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevRef.current === null) {
      prevRef.current = invalidShakeKey;
      return;
    }
    if (prevRef.current === invalidShakeKey) return;
    prevRef.current = invalidShakeKey;
    if (reducedMotion() || !boardRef.current) return;

    const el = boardRef.current;
    const tl = gsap.timeline();
    // x-axis stutter — 4 micro-swings tapering, eased to rest. ~360ms total.
    tl.to(el, { x: -8, duration: 0.04, ease: 'power2.out' })
      .to(el, { x: 8, duration: 0.06, ease: 'power2.inOut' })
      .to(el, { x: -6, duration: 0.06, ease: 'power2.inOut' })
      .to(el, { x: 4, duration: 0.06, ease: 'power2.inOut' })
      .to(el, { x: 0, duration: 0.12, ease: 'elastic.out(1, 0.4)' });
    // Red flash on the board frame — runs in parallel via position '<'.
    tl.fromTo(
      el,
      { filter: 'drop-shadow(0 0 0 rgba(255,51,102,0))' },
      {
        filter: 'drop-shadow(0 0 18px rgba(255,51,102,0.55))',
        duration: 0.14,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out',
        clearProps: 'filter',
      },
      '<',
    );
    return () => {
      tl.kill();
      gsap.set(el, { x: 0, clearProps: 'filter' });
    };
  }, [invalidShakeKey, boardRef]);
}
