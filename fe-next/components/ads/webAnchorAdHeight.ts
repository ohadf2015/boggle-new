/**
 * Web (AdSense) anchor-ad height measurement.
 *
 * On the WEB build (including the remote-URL Capacitor webview) the bottom
 * anchor ad is Google AdSense Auto-Ads, injected OUTSIDE the React tree as a
 * `position: fixed` band pinned to the viewport bottom. Unlike the native AdMob
 * banner (which publishes `--admob-banner-height`), nothing measures this band,
 * so `--bottom-stack-height` reserves no space for it and bottom-anchored CTAs
 * (e.g. the daily ready-screen Play button) hide behind it.
 *
 * `measureWebAnchorHeight` reads the live DOM and returns the band height to
 * publish into `--web-anchor-ad-height`. Kept pure (takes a Window) so it is
 * unit-testable without an observer.
 */

// AdSense anchor/overlay ads render an `<ins class="adsbygoogle-noablate">`
// (older builds: a plain `.adsbygoogle` carrying `data-anchor-status`). The
// element flips `data-anchor-status` to "dismissed" when the user closes it.
const ANCHOR_SELECTORS = 'ins.adsbygoogle-noablate, ins.adsbygoogle[data-anchor-status]';

// Clamp, mirroring the per-layer guards on `--bottom-stack-height`: a real
// anchor is ~50–100px; anything larger is a measurement glitch we must not let
// inflate the bottom reservation into a huge empty band.
export const WEB_ANCHOR_MAX_HEIGHT = 120;

// Tolerance (px) for "pinned to the viewport bottom" — fixed anchors sit at
// bottom:0, but sub-pixel rounding / safe-area can shift them a hair.
const BOTTOM_TOLERANCE = 6;

export function measureWebAnchorHeight(win: Window): number {
  const doc = win.document;
  if (!doc?.body) return 0;

  const nodes = doc.querySelectorAll<HTMLElement>(ANCHOR_SELECTORS);
  let band = 0;
  nodes.forEach((el) => {
    if (el.getAttribute('data-anchor-status') === 'dismissed') return;
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) return;
    // Only count it if it actually overlays the viewport bottom — an in-flow ad
    // unit scrolls with the page and never covers fixed bottom CTAs, so it must
    // not be reserved against.
    if (rect.bottom < win.innerHeight - BOTTOM_TOLERANCE) return;
    band = Math.max(band, rect.height);
  });

  return Math.min(Math.round(band), WEB_ANCHOR_MAX_HEIGHT);
}
