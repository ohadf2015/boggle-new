/**
 * AnchoredNativeBanner — declares the global 'anchor' banner intent on non-
 * gameplay hub routes (gameplay/results skip the anchor; results pages drive
 * their own 'slot' banner via InlineBannerAd). It no longer calls the plugin
 * directly — it pushes intent to the single bannerController, which serializes
 * against the higher-priority 'slot' owner. These tests assert the margin math
 * (the valuable part) via the request it declares.
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { bannerController } from '@/lib/native/bannerController';

const { mockPathname, addListener, mockPlatform, mockSafeArea } = vi.hoisted(() => ({
  mockPathname: { current: '/' },
  addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })),
  mockPlatform: { current: 'ios' as 'ios' | 'android' | 'web' },
  mockSafeArea: { current: { top: 0, bottom: 0, left: 0, right: 0 } },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname.current,
}));

vi.mock('@/hooks/useSafeArea', () => ({
  useSafeArea: () => mockSafeArea.current,
  default: () => mockSafeArea.current,
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => mockPlatform.current,
  },
}));

vi.mock('@capacitor-community/admob', () => ({
  AdMob: { addListener },
  BannerAdPluginEvents: {
    SizeChanged: 'bannerAdSizeChanged',
    FailedToLoad: 'bannerAdFailedToLoad',
    Closed: 'bannerAdClosed',
  },
  BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
}));

vi.mock('@/lib/native/bannerController', async () => {
  const actual = await vi.importActual<typeof import('@/lib/native/bannerController')>(
    '@/lib/native/bannerController',
  );
  return {
    ...actual,
    bannerController: {
      setRequest: vi.fn().mockResolvedValue(undefined),
      clearRequest: vi.fn().mockResolvedValue(undefined),
    },
  };
});

import AnchoredNativeBanner from '../AnchoredNativeBanner';

const setRequest = bannerController.setRequest as ReturnType<typeof vi.fn>;
const clearRequest = bannerController.clearRequest as ReturnType<typeof vi.fn>;

/** Convenience: the anchor request shape with the given margin. */
const anchorReq = (margin: number) => ['anchor', { margin, variant: 'content', priority: 1 }] as const;

describe('AnchoredNativeBanner', () => {
  beforeEach(() => {
    setRequest.mockClear().mockResolvedValue(undefined);
    clearRequest.mockClear().mockResolvedValue(undefined);
    addListener.mockClear();
    mockPathname.current = '/';
    mockPlatform.current = 'ios';
    mockSafeArea.current = { top: 0, bottom: 0, left: 0, right: 0 };
    document.documentElement.classList.remove('mobile-drawer-open');
  });
  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove('mobile-drawer-open');
  });

  it('requests the anchor banner on home route', async () => {
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(0));
  });

  it('requests margin=0 on iOS (plugin uses safeAreaLayoutGuide)', async () => {
    mockPathname.current = '/';
    mockPlatform.current = 'ios';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(0));
  });

  it('ignores iOS safe-area in margin (plugin handles home indicator)', async () => {
    mockPlatform.current = 'ios';
    mockSafeArea.current = { top: 47, bottom: 34, left: 0, right: 0 };
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(0));
  });

  it('lifts banner above gesture bar on Android (margin=safeArea.bottom)', async () => {
    mockPlatform.current = 'android';
    mockSafeArea.current = { top: 24, bottom: 24, left: 0, right: 0 };
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(24));
  });

  it('uses margin=0 on Android when safe-area is zero', async () => {
    mockPlatform.current = 'android';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(0));
  });

  it('margin is route-independent — nav floats via CSS var, not plugin margin', async () => {
    mockPathname.current = '/glossary';
    mockPlatform.current = 'android';
    mockSafeArea.current = { top: 24, bottom: 24, left: 0, right: 0 };
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(24));
  });

  it('keeps banner behind the open side menu — clears anchor while .mobile-drawer-open', async () => {
    mockPlatform.current = 'android';
    document.documentElement.classList.add('mobile-drawer-open');
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    await Promise.resolve();
    expect(setRequest).not.toHaveBeenCalled();
    expect(clearRequest).toHaveBeenCalledWith('anchor');
    expect(document.documentElement.style.getPropertyValue('--admob-banner-height')).toBe('0px');
  });

  it('restores the banner when the side menu closes (class removed → observer re-requests)', async () => {
    mockPlatform.current = 'android';
    document.documentElement.classList.add('mobile-drawer-open');
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).not.toHaveBeenCalled();

    document.documentElement.classList.remove('mobile-drawer-open');
    await new Promise((r) => setTimeout(r, 0));
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(0));
  });

  it('requests the anchor on locale-prefixed home', async () => {
    mockPathname.current = '/he';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(0));
  });

  it('requests the anchor on /leagues hub', async () => {
    mockPathname.current = '/en/leagues';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledTimes(1);
  });

  it('requests the anchor on /settings', async () => {
    mockPathname.current = '/settings';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledTimes(1);
  });

  it('clears the anchor on /singleplayer gameplay', async () => {
    mockPathname.current = '/singleplayer';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).not.toHaveBeenCalled();
    expect(clearRequest).toHaveBeenCalledWith('anchor');
  });

  it('clears the anchor on /multiplayer', async () => {
    mockPathname.current = '/en/multiplayer';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).not.toHaveBeenCalled();
    expect(clearRequest).toHaveBeenCalledWith('anchor');
  });

  it('requests the anchor on /adventure (real ads during adventure gameplay)', async () => {
    mockPathname.current = '/adventure/boss-rush';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(0));
  });

  it('clears the anchor on /daily', async () => {
    mockPathname.current = '/daily';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).not.toHaveBeenCalled();
    expect(clearRequest).toHaveBeenCalledWith('anchor');
  });

  it('keeps --admob-banner-height reserved until the anchor clear actually resolves on a blocked route', async () => {
    // Repro for the daily ready-screen Play CTA being covered "sometimes": the
    // native banner composites ABOVE the WebView, so zeroing the reservation
    // before the overlay is gone drops bottom-anchored CTAs into the banner band.
    document.documentElement.style.setProperty('--admob-banner-height', '90px');
    let resolveClear!: () => void;
    clearRequest.mockReturnValueOnce(new Promise<void>((r) => { resolveClear = () => r(); }));
    mockPathname.current = '/daily/word-hunt';

    render(<AnchoredNativeBanner />);
    await Promise.resolve();

    expect(clearRequest).toHaveBeenCalledWith('anchor');
    expect(document.documentElement.style.getPropertyValue('--admob-banner-height')).toBe('90px');

    resolveClear();
    await Promise.resolve();
    await Promise.resolve();
    expect(document.documentElement.style.getPropertyValue('--admob-banner-height')).toBe('0px');
  });

  it('registers SizeChanged listener on mount', async () => {
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(addListener).toHaveBeenCalledWith('bannerAdSizeChanged', expect.any(Function));
  });

  it('lifts banner above GlobalBottomNav on Android (margin = navHeight from --bottom-nav-height var)', async () => {
    mockPlatform.current = 'android';
    mockSafeArea.current = { top: 0, bottom: 24, left: 0, right: 0 };
    document.documentElement.style.setProperty('--bottom-nav-height', '88px');
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(88));
    document.documentElement.style.removeProperty('--bottom-nav-height');
  });

  it('lifts banner above GlobalBottomNav on iOS (margin = navHeight − safeArea, plugin re-adds inset)', async () => {
    mockPlatform.current = 'ios';
    mockSafeArea.current = { top: 0, bottom: 34, left: 0, right: 0 };
    document.documentElement.style.setProperty('--bottom-nav-height', '98px');
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(64));
    document.documentElement.style.removeProperty('--bottom-nav-height');
  });

  it('falls back to CSS-declared --bottom-nav-height when no inline value yet (Android first-paint race)', async () => {
    mockPlatform.current = 'android';
    mockSafeArea.current = { top: 0, bottom: 24, left: 0, right: 0 };
    document.documentElement.style.removeProperty('--bottom-nav-height');
    const style = document.createElement('style');
    style.textContent = ':root { --bottom-nav-height: 96px; }';
    document.head.appendChild(style);
    try {
      render(<AnchoredNativeBanner />);
      await Promise.resolve();
      expect(setRequest).toHaveBeenCalledWith(...anchorReq(96));
    } finally {
      document.head.removeChild(style);
    }
  });

  it('inline --bottom-nav-height="0px" wins over CSS fallback (nav explicitly hidden)', async () => {
    mockPlatform.current = 'android';
    mockSafeArea.current = { top: 0, bottom: 24, left: 0, right: 0 };
    document.documentElement.style.setProperty('--bottom-nav-height', '0px');
    const style = document.createElement('style');
    style.textContent = ':root { --bottom-nav-height: 96px; }';
    document.head.appendChild(style);
    try {
      render(<AnchoredNativeBanner />);
      await Promise.resolve();
      expect(setRequest).toHaveBeenCalledWith(...anchorReq(24));
    } finally {
      document.documentElement.style.removeProperty('--bottom-nav-height');
      document.head.removeChild(style);
    }
  });

  it('re-requests with the corrected margin when --bottom-nav-height changes (observer)', async () => {
    // The in-call hide-then-reshow re-read is gone (declaration is synchronous);
    // a late nav-height correction now flows through the MutationObserver, which
    // re-runs applyBanner with the fresh margin.
    mockPlatform.current = 'android';
    mockSafeArea.current = { top: 0, bottom: 24, left: 0, right: 0 };
    document.documentElement.style.setProperty('--bottom-nav-height', '96px');
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(96));

    // GlobalBottomNav publishes a corrected height → <html> style mutation.
    document.documentElement.style.setProperty('--bottom-nav-height', '112px');
    await new Promise((r) => setTimeout(r, 0));
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(112));
    document.documentElement.style.removeProperty('--bottom-nav-height');
  });

  it('registers FailedToLoad and Closed listeners that reset --admob-banner-height', async () => {
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    const failedCall = addListener.mock.calls.find((c) => c[0] === 'bannerAdFailedToLoad');
    const closedCall = addListener.mock.calls.find((c) => c[0] === 'bannerAdClosed');
    expect(failedCall).toBeTruthy();
    expect(closedCall).toBeTruthy();
    document.documentElement.style.setProperty('--admob-banner-height', '60px');
    (failedCall![1] as () => void)();
    expect(document.documentElement.style.getPropertyValue('--admob-banner-height')).toBe('0px');
    document.documentElement.style.setProperty('--admob-banner-height', '60px');
    (closedCall![1] as () => void)();
    expect(document.documentElement.style.getPropertyValue('--admob-banner-height')).toBe('0px');
  });
});
