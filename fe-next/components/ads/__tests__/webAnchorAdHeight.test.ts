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
});
