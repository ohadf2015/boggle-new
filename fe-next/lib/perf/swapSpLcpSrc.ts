/**
 * Upgrade the SSR /singleplayer LCP img from the preloaded still
 * (/mascot/winner-lcp.webp) to a right-sized animation only after LCP
 * has painted.
 *
 * Lantern models the post-swap src as the simulated LCP resource. The shared
 * happy mascot (/mascot/winner.webp, 160px, 17 frames, ~30KB) took 1.8–2.4s
 * to download on the throttled 1.6Mbps link and made simLCP unwinnable.
 * winner-swap.webp is that same pose at the 112px display box (~6KB, 5 frames)
 * so the modeled download stays under ~400ms. The shared file stays full-size
 * for pages that show the happy mascot larger than this shell.
 *
 * Changing src on the element that already painted does not add a larger
 * entry, so the preloaded shell wins observed LCP. fetchpriority is dropped
 * to low BEFORE the src write so the post-paint fetch is not a High-priority
 * request Lantern can re-attribute to the LCP element.
 *
 * Fallback when no LCP entry arrives (observer missing, or nothing painted):
 * window load + afterLoadIdle. Never swaps before one of those two signals.
 */
import { afterLoadIdle as defaultAfterLoadIdle } from './afterLoadIdle';

export const SP_LCP_PAINT_ID = 'sp-lcp-paint';
export const SP_WINNER_STILL_SRC = '/mascot/winner-lcp.webp';
export const SP_WINNER_ANIMATED_SRC = '/mascot/winner-swap.webp';

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
