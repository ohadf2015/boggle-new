'use client';

import { useEffect } from 'react';
import { measureWebAnchorHeight } from './webAnchorAdHeight';

/**
 * Publishes the WEB AdSense anchor-ad band height to `--web-anchor-ad-height`
 * (folded into `--bottom-stack-height` in globals.css) so every bottom-anchored
 * consumer — the daily ready-screen Play button, cookie consent, body padding —
 * clears the ad. See {@link measureWebAnchorHeight} for the why.
 *
 * The native AdMob banner has its own publisher (AnchoredNativeBanner →
 * `--admob-banner-height`); this observer is independent and a no-op when no
 * AdSense anchor exists (the var stays 0px), so it is safe to mount everywhere.
 */
export default function WebAnchorAdObserver() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    let last = -1;
    let rafId = 0;

    const apply = () => {
      rafId = 0;
      const height = measureWebAnchorHeight(window);
      if (height === last) return; // no-op guard: avoid style thrash
      last = height;
      root.style.setProperty('--web-anchor-ad-height', `${height}px`);
      // Signal presence independently of the bottom nav so nav-less pages still
      // reserve the band (the padding gate keys off `has-web-anchor-ad` too).
      root.classList.toggle('has-web-anchor-ad', height > 0);
    };

    // Coalesce bursts: AdSense mutates the DOM heavily during injection, and we
    // observe the whole body subtree, so schedule at most one measure per frame.
    const schedule = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(apply);
    };

    // AdSense injects/dismisses the anchor asynchronously and resizes it on
    // orientation/refresh → watch subtree adds/removes + the status/style attrs.
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-anchor-status', 'style', 'class'],
    });

    // The fixed band can change height without a DOM mutation (creative swap).
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    ro?.observe(document.body);

    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);

    apply();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      mo.disconnect();
      ro?.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      root.style.setProperty('--web-anchor-ad-height', '0px');
      root.classList.remove('has-web-anchor-ad');
    };
  }, []);

  return null;
}
