import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdSenseAnchorHeight } from '../useAdSenseAnchorHeight';

const ANCHOR_VAR = '--adsense-anchor-height';

function setElementHeight(el: HTMLElement, height: number) {
  Object.defineProperty(el, 'offsetHeight', {
    configurable: true,
    get: () => height,
  });
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      top: window.innerHeight - height,
      bottom: window.innerHeight,
      left: 0,
      right: window.innerWidth,
      width: window.innerWidth,
      height,
      x: 0,
      y: window.innerHeight - height,
      toJSON: () => ({}),
    }),
  });
}

function makeAnchorAd(height: number): HTMLElement {
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.setAttribute('data-anchor-status', 'displayed');
  ins.style.position = 'fixed';
  ins.style.bottom = '0';
  ins.style.left = '0';
  ins.style.right = '0';
  setElementHeight(ins, height);
  return ins;
}

describe('useAdSenseAnchorHeight', () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty(ANCHOR_VAR);
    document.body.innerHTML = '';
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 });
  });

  afterEach(() => {
    document.documentElement.style.removeProperty(ANCHOR_VAR);
    document.body.innerHTML = '';
  });

  it('sets CSS variable to 0 when no AdSense anchor ad is present', () => {
    renderHook(() => useAdSenseAnchorHeight());
    expect(document.documentElement.style.getPropertyValue(ANCHOR_VAR)).toBe('0px');
  });

  it('updates CSS variable with ad height when an anchor ad is added to body', async () => {
    renderHook(() => useAdSenseAnchorHeight());

    await act(async () => {
      const ad = makeAnchorAd(90);
      document.body.appendChild(ad);
      // Allow MutationObserver microtask to flush
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.documentElement.style.getPropertyValue(ANCHOR_VAR)).toBe('90px');
  });

  it('resets CSS variable to 0 when the anchor ad is removed', async () => {
    const ad = makeAnchorAd(70);
    document.body.appendChild(ad);

    renderHook(() => useAdSenseAnchorHeight());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.documentElement.style.getPropertyValue(ANCHOR_VAR)).toBe('70px');

    await act(async () => {
      ad.remove();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.documentElement.style.getPropertyValue(ANCHOR_VAR)).toBe('0px');
  });

  it('ignores non-fixed adsbygoogle elements (inline content ads)', async () => {
    renderHook(() => useAdSenseAnchorHeight());

    await act(async () => {
      const inline = document.createElement('ins');
      inline.className = 'adsbygoogle';
      inline.style.display = 'block';
      setElementHeight(inline, 250);
      document.body.appendChild(inline);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.documentElement.style.getPropertyValue(ANCHOR_VAR)).toBe('0px');
  });

  it('clears CSS variable on unmount', async () => {
    const ad = makeAnchorAd(60);
    document.body.appendChild(ad);

    const { unmount } = renderHook(() => useAdSenseAnchorHeight());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.documentElement.style.getPropertyValue(ANCHOR_VAR)).toBe('60px');

    unmount();

    expect(document.documentElement.style.getPropertyValue(ANCHOR_VAR)).toBe('0px');
  });
});
