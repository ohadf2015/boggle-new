import { describe, it, expect, beforeEach } from 'vitest';
import { measureWebAnchorHeight, WEB_ANCHOR_MAX_HEIGHT } from '../webAnchorAdHeight';

/**
 * jsdom does not run layout, so getBoundingClientRect() returns all-zeros by
 * default. Each test stubs the rect of the anchor element it creates to model
 * the real AdSense anchor geometry (a position:fixed band pinned to the bottom).
 */
function makeAnchor(opts: {
  className?: string;
  status?: string | null;
  height: number;
  bottom?: number; // viewport-relative bottom; defaults to innerHeight (pinned)
}): HTMLElement {
  const el = document.createElement('ins');
  el.className = opts.className ?? 'adsbygoogle adsbygoogle-noablate';
  if (opts.status !== undefined && opts.status !== null) {
    el.setAttribute('data-anchor-status', opts.status);
  }
  const bottom = opts.bottom ?? window.innerHeight;
  el.getBoundingClientRect = () =>
    ({
      height: opts.height,
      width: 360,
      top: bottom - opts.height,
      bottom,
      left: 0,
      right: 360,
      x: 0,
      y: bottom - opts.height,
      toJSON: () => ({}),
    }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

describe('measureWebAnchorHeight', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  });

  it('returns 0 when no AdSense anchor is present', () => {
    expect(measureWebAnchorHeight(window)).toBe(0);
  });

  it('returns the band height of a bottom-pinned anchor', () => {
    makeAnchor({ height: 90, bottom: 800 });
    expect(measureWebAnchorHeight(window)).toBe(90);
  });

  it('returns 0 for a dismissed anchor', () => {
    makeAnchor({ height: 90, status: 'dismissed', bottom: 800 });
    expect(measureWebAnchorHeight(window)).toBe(0);
  });

  it('ignores an in-flow (non-bottom-pinned) ad unit', () => {
    // An in-flow ad sits mid-page; its rect.bottom is well above the viewport bottom.
    makeAnchor({ height: 250, bottom: 400 });
    expect(measureWebAnchorHeight(window)).toBe(0);
  });

  it('ignores a zero-height (unfilled) anchor slot', () => {
    makeAnchor({ height: 0, bottom: 800 });
    expect(measureWebAnchorHeight(window)).toBe(0);
  });

  it('clamps a pathologically tall anchor to the max', () => {
    makeAnchor({ height: 600, bottom: 800 });
    expect(measureWebAnchorHeight(window)).toBe(WEB_ANCHOR_MAX_HEIGHT);
  });

  it('takes the tallest when multiple anchor nodes exist', () => {
    makeAnchor({ height: 50, bottom: 800 });
    makeAnchor({ height: 100, bottom: 800 });
    expect(measureWebAnchorHeight(window)).toBe(100);
  });

  it('also detects the data-anchor-status variant without the noablate class', () => {
    makeAnchor({ className: 'adsbygoogle', status: 'displayed', height: 64, bottom: 800 });
    expect(measureWebAnchorHeight(window)).toBe(64);
  });

  /**
   * Fallback: Google Auto-Ads frequently renders the bottom anchor as a
   * `position: fixed` WRAPPER (e.g. `<div id="aswift_..._anchor">`) holding an
   * iframe — NOT an `ins.adsbygoogle-noablate`. The narrow <ins> selector misses
   * it, so the band must also be discovered by walking from the ad frame/ins up
   * to its nearest fixed/sticky ancestor and measuring that.
   */
  function makeWrappedAd(opts: {
    inner: 'iframe' | 'ins';
    innerAttrs?: Record<string, string>;
    wrapperPosition?: string; // computed position of the pinned ancestor
    height: number;
    bottom?: number; // viewport-relative bottom of the WRAPPER
  }): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.position = opts.wrapperPosition ?? 'fixed';
    const bottom = opts.bottom ?? window.innerHeight;
    wrapper.getBoundingClientRect = () =>
      ({
        height: opts.height,
        width: 360,
        top: bottom - opts.height,
        bottom,
        left: 0,
        right: 360,
        x: 0,
        y: bottom - opts.height,
        toJSON: () => ({}),
      }) as DOMRect;

    const inner = document.createElement(opts.inner);
    for (const [k, v] of Object.entries(opts.innerAttrs ?? {})) {
      inner.setAttribute(k, v);
    }
    // The inner ad node is statically positioned inside the pinned wrapper; its
    // own rect would NOT register as bottom-pinned, so the walk-up must measure
    // the wrapper. Give it a non-bottom rect to prove that.
    inner.getBoundingClientRect = () =>
      ({
        height: opts.height,
        width: 360,
        top: 0,
        bottom: opts.height,
        left: 0,
        right: 360,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    wrapper.appendChild(inner);
    document.body.appendChild(wrapper);
    return wrapper;
  }

  // Non-navigable srcs that still match the `src*="googleads"` selector — avoids
  // happy-dom issuing a real network fetch for the iframe.
  const GOOGLEADS_SRC = 'data:text/html,googleads';

  it('detects an iframe ad whose fixed wrapper is pinned to the bottom', () => {
    makeWrappedAd({
      inner: 'iframe',
      innerAttrs: { src: GOOGLEADS_SRC },
      height: 90,
      bottom: 800,
    });
    expect(measureWebAnchorHeight(window)).toBe(90);
  });

  it('detects a plain ins.adsbygoogle (no anchor class/status) in a fixed bottom wrapper', () => {
    makeWrappedAd({
      inner: 'ins',
      innerAttrs: { class: 'adsbygoogle' },
      height: 70,
      bottom: 800,
    });
    expect(measureWebAnchorHeight(window)).toBe(70);
  });

  it('detects an aswift-named iframe (Google ad frame) in a fixed bottom wrapper', () => {
    makeWrappedAd({
      inner: 'iframe',
      innerAttrs: { name: 'aswift_3', src: 'about:blank' },
      height: 60,
      bottom: 800,
    });
    expect(measureWebAnchorHeight(window)).toBe(60);
  });

  it('ignores a fixed ad wrapper that is NOT pinned to the bottom (top anchor)', () => {
    makeWrappedAd({
      inner: 'iframe',
      innerAttrs: { src: GOOGLEADS_SRC },
      height: 90,
      bottom: 90, // pinned to the TOP, not the bottom
    });
    expect(measureWebAnchorHeight(window)).toBe(0);
  });

  it('ignores an ad frame with no fixed/sticky ancestor (in-flow unit)', () => {
    makeWrappedAd({
      inner: 'iframe',
      innerAttrs: { src: GOOGLEADS_SRC },
      wrapperPosition: 'static',
      height: 250,
      bottom: 800,
    });
    expect(measureWebAnchorHeight(window)).toBe(0);
  });
});
