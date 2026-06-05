import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';

const { showBanner, hideBanner, resumeBanner, isNative, listeners, foregroundCb } = vi.hoisted(() => ({
  showBanner: vi.fn().mockResolvedValue(undefined),
  hideBanner: vi.fn().mockResolvedValue(undefined),
  resumeBanner: vi.fn().mockResolvedValue(undefined),
  isNative: { current: true },
  listeners: {} as Record<string, () => void>,
  foregroundCb: { current: null as null | (() => void) },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNative.current },
}));

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    addListener: (evt: string, cb: () => void) => {
      listeners[evt] = cb;
      return Promise.resolve({ remove: vi.fn() });
    },
    resumeBanner: (...a: unknown[]) => resumeBanner(...a),
  },
  BannerAdPluginEvents: {
    Loaded: 'bannerAdLoaded',
    SizeChanged: 'bannerAdSizeChanged',
    FailedToLoad: 'bannerAdFailedToLoad',
  },
  BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
}));

vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({ showBanner, hideBanner }),
}));

vi.mock('@/hooks/useAppLifecycle', () => ({
  useAppLifecycle: ({ onForeground }: { onForeground?: () => void }) => {
    foregroundCb.current = onForeground ?? null;
  },
}));

const setOps = vi.fn();
const notifyLoaded = vi.fn();
const notifyFailed = vi.fn();
const reassert = vi.fn();
const setSuppressed = vi.fn();

vi.mock('@/lib/native/bannerController', () => ({
  bannerController: {
    setOps: (...a: unknown[]) => setOps(...a),
    notifyLoaded: () => notifyLoaded(),
    notifyFailed: () => notifyFailed(),
    reassert: () => reassert(),
    setSuppressed: (v: boolean) => setSuppressed(v),
  },
}));

/** Flush the MutationObserver microtask queue. */
const flushObserver = () => new Promise((r) => setTimeout(r, 0));

import BannerCoordinatorMount from '../BannerCoordinatorMount';

describe('BannerCoordinatorMount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isNative.current = true;
    for (const k of Object.keys(listeners)) delete listeners[k];
    foregroundCb.current = null;
    document.documentElement.classList.remove('mobile-drawer-open');
  });

  it('injects show/hide ops into the coordinator on native mount', async () => {
    render(<BannerCoordinatorMount />);
    expect(setOps).toHaveBeenCalledTimes(1);
    const ops = setOps.mock.calls[0][0];
    await ops.show(42, 'content');
    expect(showBanner).toHaveBeenCalledWith('BOTTOM_CENTER', 42, { variant: 'content' });
    ops.hide();
    expect(hideBanner).toHaveBeenCalled();
  });

  it('restores native visibility (resumeBanner) before re-showing — fixes "banner stays hidden after closing the menu"', async () => {
    render(<BannerCoordinatorMount />);
    const ops = setOps.mock.calls[0][0];
    resumeBanner.mockClear();
    showBanner.mockClear();
    await ops.show(0, 'content');
    // resumeBanner must run (native re-show path doesn't restore GONE visibility)
    expect(resumeBanner).toHaveBeenCalledTimes(1);
    expect(showBanner).toHaveBeenCalled();
    // resume must precede the show so the AdView is VISIBLE again
    expect(resumeBanner.mock.invocationCallOrder[0]).toBeLessThan(
      showBanner.mock.invocationCallOrder[0],
    );
  });

  it('routes Loaded/SizeChanged → notifyLoaded and FailedToLoad → notifyFailed', () => {
    render(<BannerCoordinatorMount />);
    listeners['bannerAdLoaded']?.();
    expect(notifyLoaded).toHaveBeenCalledTimes(1);
    listeners['bannerAdSizeChanged']?.();
    expect(notifyLoaded).toHaveBeenCalledTimes(2);
    listeners['bannerAdFailedToLoad']?.();
    expect(notifyFailed).toHaveBeenCalledTimes(1);
  });

  it('re-asserts on app foreground', () => {
    render(<BannerCoordinatorMount />);
    expect(foregroundCb.current).toBeTypeOf('function');
    foregroundCb.current?.();
    expect(reassert).toHaveBeenCalledTimes(1);
  });

  it('re-asserts when the document becomes visible', () => {
    const spy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    render(<BannerCoordinatorMount />);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(reassert).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('suppresses the banner when the side menu opens (mobile-drawer-open added)', async () => {
    render(<BannerCoordinatorMount />);
    setSuppressed.mockClear();
    document.documentElement.classList.add('mobile-drawer-open');
    await flushObserver();
    expect(setSuppressed).toHaveBeenCalledWith(true);
  });

  it('restores the banner when the side menu closes (mobile-drawer-open removed)', async () => {
    document.documentElement.classList.add('mobile-drawer-open');
    render(<BannerCoordinatorMount />);
    setSuppressed.mockClear();
    document.documentElement.classList.remove('mobile-drawer-open');
    await flushObserver();
    expect(setSuppressed).toHaveBeenCalledWith(false);
  });

  it('reflects the initial drawer state on mount (open before render)', () => {
    document.documentElement.classList.add('mobile-drawer-open');
    render(<BannerCoordinatorMount />);
    expect(setSuppressed).toHaveBeenCalledWith(true);
  });

  it('does not observe the drawer on web', async () => {
    isNative.current = false;
    render(<BannerCoordinatorMount />);
    document.documentElement.classList.add('mobile-drawer-open');
    await flushObserver();
    expect(setSuppressed).not.toHaveBeenCalled();
  });

  it('refreshes the banner on a ~45-minute interval (fresh creative, not a stale ad)', () => {
    vi.useFakeTimers();
    const visSpy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    try {
      render(<BannerCoordinatorMount />);
      reassert.mockClear();
      vi.advanceTimersByTime(45 * 60 * 1000);
      expect(reassert).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(45 * 60 * 1000);
      expect(reassert).toHaveBeenCalledTimes(2);
    } finally {
      visSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('skips the periodic refresh while backgrounded (no wasted reload)', () => {
    vi.useFakeTimers();
    const visSpy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    try {
      render(<BannerCoordinatorMount />);
      reassert.mockClear();
      vi.advanceTimersByTime(45 * 60 * 1000);
      expect(reassert).not.toHaveBeenCalled();
    } finally {
      visSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('stops the refresh interval on unmount', () => {
    vi.useFakeTimers();
    const visSpy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    try {
      const { unmount } = render(<BannerCoordinatorMount />);
      unmount();
      reassert.mockClear();
      vi.advanceTimersByTime(45 * 60 * 1000);
      expect(reassert).not.toHaveBeenCalled();
    } finally {
      visSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('re-asserts (debounced) on orientation change so the adaptive banner re-sizes/re-anchors', () => {
    vi.useFakeTimers();
    try {
      render(<BannerCoordinatorMount />);
      reassert.mockClear();
      window.dispatchEvent(new Event('orientationchange'));
      // debounced — not immediate
      expect(reassert).not.toHaveBeenCalled();
      vi.advanceTimersByTime(250);
      expect(reassert).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('coalesces a burst of resize events into a single reassert (rotation fires many)', () => {
    vi.useFakeTimers();
    try {
      render(<BannerCoordinatorMount />);
      reassert.mockClear();
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));
      vi.advanceTimersByTime(250);
      expect(reassert).toHaveBeenCalledTimes(1); // debounced to one
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not listen for orientation/resize on web', () => {
    vi.useFakeTimers();
    try {
      isNative.current = false;
      render(<BannerCoordinatorMount />);
      reassert.mockClear();
      window.dispatchEvent(new Event('orientationchange'));
      vi.advanceTimersByTime(250);
      expect(reassert).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not inject ops on web', () => {
    isNative.current = false;
    render(<BannerCoordinatorMount />);
    expect(setOps).not.toHaveBeenCalled();
  });

  it('clears ops on unmount', () => {
    const { unmount } = render(<BannerCoordinatorMount />);
    setOps.mockClear();
    unmount();
    expect(setOps).toHaveBeenCalledWith(null);
  });
});
