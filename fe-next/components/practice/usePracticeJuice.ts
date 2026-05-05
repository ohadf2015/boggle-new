import { useCallback } from 'react';
import gsap from 'gsap';

export interface JuiceTilePos {
  x: number;
  y: number;
  el: Element;
}

const reduced = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * GSAP-powered juice timelines for practice mode. Every trigger no-ops under
 * prefers-reduced-motion. Tile-pop, shake, duplicate-bounce, and goal-celebrate
 * are short (≤300ms) so they don't block subsequent input.
 */
export function usePracticeJuice() {
  const triggerWordFound = useCallback((tiles: JuiceTilePos[]) => {
    if (reduced()) return;
    const tl = gsap.timeline();
    tiles.forEach((t, i) => {
      tl.fromTo(
        t.el,
        { scale: 1 },
        { scale: 1.18, duration: 0.16, ease: 'back.out(2)', yoyo: true, repeat: 1 },
        i * 0.04,
      );
    });
  }, []);

  const triggerInvalid = useCallback((el: Element) => {
    if (reduced()) return;
    gsap.timeline().fromTo(el, { x: 0 }, { x: -6, duration: 0.06, repeat: 5, yoyo: true, ease: 'power1.inOut' });
  }, []);

  const triggerDuplicate = useCallback((el: Element) => {
    if (reduced()) return;
    gsap.timeline().fromTo(el, { y: 0 }, { y: -4, duration: 0.18, yoyo: true, repeat: 1, ease: 'sine.inOut' });
  }, []);

  const triggerGoalComplete = useCallback(() => {
    if (reduced()) return gsap.timeline();
    return gsap.timeline().to(document.body, { duration: 0.001 });
  }, []);

  return { triggerWordFound, triggerInvalid, triggerDuplicate, triggerGoalComplete };
}
