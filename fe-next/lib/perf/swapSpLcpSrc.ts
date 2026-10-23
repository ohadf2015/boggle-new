/**
 * Upgrade the SSR /singleplayer LCP img from the preloaded still
 * (/mascot/winner-lcp.webp) to the animated winner.webp only after LCP
 * has painted.
 *
 * A second equal-area <img> (PageLoader's happy mascot, 112x112, fetchpriority
 * high) raced the shell and became the LCP resource in half of r7 PSI runs
 * (resourceLoadDelay tracked winner.webp's rendererStartTime, 1.5–2.2s).
 * Changing src on the element that already painted does not add a larger
 * entry, so the preloaded shell wins deterministically. fetchpriority is
 * dropped to low BEFORE the src write so the post-paint fetch is not a
 * High-priority request Lantern can re-attribute to the LCP element.
 *
 * Fallback when no LCP entry arrives (observer missing, or nothing painted):
 * window load + afterLoadIdle. Never swaps before one of those two signals.
 */
import { afterLoadIdle as defaultAfterLoadIdle } from './afterLoadIdle';

export const SP_LCP_PAINT_ID = 'sp-lcp-paint';
export const SP_WINNER_STILL_SRC = '/mascot/winner-lcp.webp';
export const SP_WINNER_ANIMATED_SRC = '/mascot/winner.webp';

export interface SpLcpImg {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  src: string;
  fetchPriority?: string;
}

export type SpLcpIdle = (fn: () => void) => () => void;

export interface ScheduleSpLcpSrcSwapOptions {
  afterLoadIdle?: SpLcpIdle;
  getImg?: () => SpLcpImg | null;
  animatedSrc?: string;
  Observer?: typeof PerformanceObserver;
}

export function defaultSpLcpImg(): SpLcpImg | null {
  if (typeof document === 'undefined') return null;
  const paint = document.getElementById(SP_LCP_PAINT_ID);
  const img = paint?.querySelector('img');
  return img instanceof HTMLImageElement ? img : null;
}

/** Returns true when the src actually changed. */
export function applySpLcpSrcSwap(
  img: SpLcpImg,
  animatedSrc: string = SP_WINNER_ANIMATED_SRC,
): boolean {
  const current = img.getAttribute('src') || '';
  if (current === animatedSrc || current.endsWith(animatedSrc)) return false;
  img.setAttribute('fetchpriority', 'low');
  if ('fetchPriority' in img) img.fetchPriority = 'low';
  img.setAttribute('src', animatedSrc);
  img.src = animatedSrc;
  return true;
}

export function scheduleSpLcpSrcSwap(
  options: ScheduleSpLcpSrcSwapOptions = {},
): () => void {
  const afterIdle = options.afterLoadIdle ?? defaultAfterLoadIdle;
  const getImg = options.getImg ?? defaultSpLcpImg;
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
    const img = getImg();
    if (!img) return false;
    applySpLcpSrcSwap(img, animatedSrc);
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
