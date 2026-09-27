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

// Fallback discovery: Google Auto-Ads does not always render the anchor as an
// `ins.adsbygoogle-noablate`. It frequently wraps an ad iframe in a
// `position: fixed` container (e.g. `<div id="aswift_..._anchor">`) that the
// narrow <ins> selectors miss. These match the ad FRAME/ins; we then walk up to
// the pinned ancestor and measure that band.
const AD_FRAME_SELECTORS =
  'ins.adsbygoogle, iframe[src*="googleads"], iframe[src*="doubleclick"], iframe[src*="googlesyndication"], iframe[name^="aswift"]';

// Returns the height (px) of `el` only if its rect overlays the viewport bottom.
// An in-flow ad scrolls with the page and never covers fixed bottom CTAs, so it
// must not be reserved against.
function bottomPinnedHeight(rect: DOMRect, win: Window): number {
  if (rect.height <= 0) return 0;
  if (rect.bottom < win.innerHeight - BOTTOM_TOLERANCE) return 0;
  return rect.height;
}

// Google pins the WRAPPER (position: fixed/sticky); the <ins>/<iframe> inside is
// statically positioned, so its own rect is not bottom-pinned. Walk up to the
// nearest fixed/sticky ancestor and measure that band.
function fixedBottomBand(el: HTMLElement, win: Window): number {
  let node: HTMLElement | null = el;
  while (node && node !== win.document.body) {
    const position = win.getComputedStyle(node).position;
    if (position === 'fixed' || position === 'sticky') {
      return bottomPinnedHeight(node.getBoundingClientRect(), win);
    }
    node = node.parentElement;
  }
  return 0;
}

export function measureWebAnchorHeight(win: Window): number {
  const doc = win.document;
  if (!doc?.body) return 0;

  let band = 0;

  // Fast path: the known AdSense anchor <ins> markup (measured in place).
  doc.querySelectorAll<HTMLElement>(ANCHOR_SELECTORS).forEach((el) => {
    if (el.getAttribute('data-anchor-status') === 'dismissed') return;
    band = Math.max(band, bottomPinnedHeight(el.getBoundingClientRect(), win));
  });

  // Fallback: any Google ad frame/ins whose fixed/sticky wrapper is pinned to
  // the viewport bottom. Catches Auto-Ads anchors that aren't an
  // `ins.adsbygoogle-noablate` (Google varies the injected DOM).
  if (band === 0) {
    doc.querySelectorAll<HTMLElement>(AD_FRAME_SELECTORS).forEach((el) => {
      if (el.getAttribute('data-anchor-status') === 'dismissed') return;
      band = Math.max(band, fixedBottomBand(el, win));
    });
  }

  return Math.min(Math.round(band), WEB_ANCHOR_MAX_HEIGHT);
}
