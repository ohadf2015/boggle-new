'use client';

import { useEffect } from 'react';

const ANCHOR_VAR = '--adsense-anchor-height';

const ANCHOR_SELECTOR = [
  'ins.adsbygoogle[data-anchor-status="displayed"]',
  'ins.adsbygoogle[data-anchor-shown="true"]',
  'ins.adsbygoogle[data-anchor-status]',
  'ins.adsbygoogle.google-anchor',
  '.google-auto-placed[data-anchor-status="displayed"]',
].join(',');

function isFixedToBottom(el: HTMLElement): boolean {
  const cs = (typeof window !== 'undefined' ? window.getComputedStyle(el) : null);
  const position = cs?.position ?? el.style.position;
  if (position !== 'fixed') return false;

  const rect = el.getBoundingClientRect();
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 0;
  // Consider "near bottom" when the element's bottom is within 8px of viewport bottom.
  return rect.height > 0 && Math.abs(rect.bottom - viewportH) <= 8;
}

function findAnchorAd(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const nodes = document.querySelectorAll<HTMLElement>(ANCHOR_SELECTOR);
  for (const el of Array.from(nodes)) {
    if (isFixedToBottom(el)) return el;
  }
  return null;
}

function setVar(height: number) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty(ANCHOR_VAR, `${height}px`);
}

/**
 * Tracks Google AdSense "anchor" (sticky bottom overlay) ads and exposes their
 * current height via the `--adsense-anchor-height` CSS variable.
 *
 * AdSense auto-ads inject a fixed-position overlay at the bottom of the
 * viewport which otherwise covers our fixed mobile bottom navigation. Other
 * fixed-bottom UI reads this variable to offset itself above the ad.
 */
export function useAdSenseAnchorHeight(): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    let trackedEl: HTMLElement | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const measure = () => {
      if (!trackedEl || !trackedEl.isConnected || !isFixedToBottom(trackedEl)) {
        setVar(0);
        return;
      }
      const h = trackedEl.getBoundingClientRect().height || trackedEl.offsetHeight || 0;
      setVar(Math.round(h));
    };

    const track = (el: HTMLElement | null) => {
      if (trackedEl === el) {
        measure();
        return;
      }
      resizeObserver?.disconnect();
      resizeObserver = null;
      trackedEl = el;
      if (el && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => measure());
        resizeObserver.observe(el);
      }
      measure();
    };

    const rescan = () => track(findAnchorAd());

    rescan();

    const mutationObserver = new MutationObserver(rescan);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-anchor-status', 'data-anchor-shown'],
    });

    const onResize = () => measure();
    window.addEventListener('resize', onResize);

    return () => {
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', onResize);
      setVar(0);
    };
  }, []);
}

export default useAdSenseAnchorHeight;
