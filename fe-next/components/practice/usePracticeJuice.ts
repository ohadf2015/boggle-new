import { useCallback, type RefObject } from 'react';
import gsap from 'gsap';
import type { PracticePixiFxHandle } from './PracticePixiFx';

export interface JuiceTilePos {
  x: number;
  y: number;
  el: Element;
}

export interface PracticeJuiceOptions {
  /** Optional Pixi FX ref for particle bursts on word-found + goal-celebrate. */
  fxRef?: RefObject<PracticePixiFxHandle | null>;
  /** Mode-flavored particle color (0xRRGGBB). Defaults to neo-cyan. */
  burstColor?: number;
}

const reduced = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * GSAP-powered juice timelines for practice mode. Every trigger no-ops under
 * prefers-reduced-motion. Tile-pop, shake, duplicate-bounce, and goal-celebrate
 * are short (≤300ms) so they don't block subsequent input.
 *
 * When an `fxRef` is provided, word-found also fires a Pixi particle burst
 * per tile (mode-colored) and goal-complete fires a fullscreen celebration.
 */
export function usePracticeJuice(opts: PracticeJuiceOptions = {}) {
  const { fxRef, burstColor = 0x00ffff } = opts;

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
      const fx = fxRef?.current;
      if (fx) {
        // tile.x/y are viewport-relative (getBoundingClientRect); FX translates
        // to canvas-local internally. Center the burst on the tile.
        const el = t.el as HTMLElement;
        const r = el.getBoundingClientRect?.();
        const cx = r ? r.left + r.width / 2 : t.x;
        const cy = r ? r.top + r.height / 2 : t.y;
        fx.burst(cx, cy, burstColor);
      }
    });
  }, [fxRef, burstColor]);

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
    fxRef?.current?.goalCelebrate();
    return gsap.timeline().to(document.body, { duration: 0.001 });
  }, [fxRef]);

  const triggerCompletionBurst = useCallback(() => {
    if (reduced()) return;
    // Fire 2-3x more intense burst than word-found for fullscreen celebration
    const fx = fxRef?.current;
    if (fx && typeof window !== 'undefined') {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      for (let i = 0; i < 3; i++) {
        fx.burst(cx, cy, burstColor);
      }
    }
  }, [fxRef, burstColor]);

  return { triggerWordFound, triggerInvalid, triggerDuplicate, triggerGoalComplete, triggerCompletionBurst };
}
