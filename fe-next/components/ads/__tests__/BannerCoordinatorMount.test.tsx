import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';

const { showBanner, hideBanner, isNative, listeners, foregroundCb } = vi.hoisted(() => ({
  showBanner: vi.fn().mockResolvedValue(undefined),
  hideBanner: vi.fn().mockResolvedValue(undefined),
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

vi.mock('@/lib/native/bannerController', () => ({
  bannerController: {
    setOps: (...a: unknown[]) => setOps(...a),
    notifyLoaded: () => notifyLoaded(),
    notifyFailed: () => notifyFailed(),
    reassert: () => reassert(),
  },
}));

import BannerCoordinatorMount from '../BannerCoordinatorMount';

describe('BannerCoordinatorMount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isNative.current = true;
    for (const k of Object.keys(listeners)) delete listeners[k];
    foregroundCb.current = null;
  });

  it('injects show/hide ops into the coordinator on native mount', () => {
    render(<BannerCoordinatorMount />);
    expect(setOps).toHaveBeenCalledTimes(1);
    const ops = setOps.mock.calls[0][0];
    ops.show(42, 'content');
    expect(showBanner).toHaveBeenCalledWith('BOTTOM_CENTER', 42, { variant: 'content' });
    ops.hide();
    expect(hideBanner).toHaveBeenCalled();
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
