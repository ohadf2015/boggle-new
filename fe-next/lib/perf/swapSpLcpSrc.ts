/**
 * Upgrade the SSR /singleplayer LCP shell from the preloaded still
 * (/mascot/winner-lcp.webp) to a right-sized animation only after LCP
 * has painted.
 *
 * Lantern attributes simulated LCP to the LCP element's final img src.
 * Writing winner-swap.webp onto that img (even after the still has painted)
 * makes the simulated resource the JS-gated swap, and byte cuts cannot
 * move that number. The animation is therefore a CSS background on
 * #sp-lcp-anim, an overlay the same 112px box as the still. The img src
 * stays winner-lcp.webp for the life of the page, so it remains the only
 * <img> LCP candidate. The overlay is not the full-viewport shell: a
 * background-image on that box would win LCP by element size.
 *
 * winner-swap.webp is the same pose at the 112px display box (~6KB, 5
 * frames). The shared /mascot/winner.webp stays full-size for other pages.
 *
 * Fallback when no LCP entry arrives (observer missing, or nothing painted):
 * window load + afterLoadIdle. Never applies the background before one of
 * those two signals.
 */
import { afterLoadIdle as defaultAfterLoadIdle } from './afterLoadIdle';

export const SP_LCP_PAINT_ID = 'sp-lcp-paint';
export const SP_LCP_ANIM_ID = 'sp-lcp-anim';
export const SP_WINNER_STILL_SRC = '/mascot/winner-lcp.webp';
export const SP_WINNER_ANIMATED_SRC = '/mascot/winner-swap.webp';

export interface SpLcpAnimEl {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  style: { backgroundImage: string };
}

export type SpLcpIdle = (fn: () => void) => () => void;

export interface ScheduleSpLcpSrcSwapOptions {
  afterLoadIdle?: SpLcpIdle;
  getAnim?: () => SpLcpAnimEl | null;
  animatedSrc?: string;
  Observer?: typeof PerformanceObserver;
}

export function defaultSpLcpAnim(): SpLcpAnimEl | null {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById(SP_LCP_ANIM_ID);
  return el instanceof HTMLElement ? el : null;
}

/** Returns true when the background actually changed. Never writes an img src. */
export function applySpLcpSrcSwap(
  el: SpLcpAnimEl,
  animatedSrc: string = SP_WINNER_ANIMATED_SRC,
): boolean {
  const current = el.style.backgroundImage || '';
  if (current.includes(animatedSrc)) return false;
  el.style.backgroundImage = `url("${animatedSrc}")`;
  return true;
}

export function scheduleSpLcpSrcSwap(
  options: ScheduleSpLcpSrcSwapOptions = {},
): () => void {
  const afterIdle = options.afterLoadIdle ?? defaultAfterLoadIdle;
  const getAnim = options.getAnim ?? defaultSpLcpAnim;
  const animatedSrc = options.animatedSrc ?? SP_WINNER_ANIMATED_SRC;
  const Observer = options.Observer
    ?? (typeof PerformanceObserver !== 'undefined' ? PerformanceObserver : undefined);

  let settled = false;
  let observer: PerformanceObserver | undefined;
  let cancelIdle: () => void = () => {};

  const stop = () => {
    observer?.disconnect();
    observer = undefined;
    cancelIdle();
    cancelIdle = () => {};
  };

  const trySwap = (): boolean => {
    if (settled) return false;
    const el = getAnim();
    if (!el) return false;
    applySpLcpSrcSwap(el, animatedSrc);
    settled = true;
    stop();
    return true;
  };

  cancelIdle = afterIdle(() => {
    trySwap();
  });

  if (Observer) {
    try {
      observer = new Observer((list) => {
        if (list.getEntries().length > 0) trySwap();
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      observer = undefined;
    }
  }

  return () => {
    settled = true;
    stop();
  };
}
