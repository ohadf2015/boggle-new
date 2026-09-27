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
    isPluginAvailable: () => true,
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

  it('lifts banner above gesture bar on Android (margin=safeArea.bottom) WHEN nav is present', async () => {
    mockPlatform.current = 'android';
    mockSafeArea.current = { top: 24, bottom: 24, left: 0, right: 0 };
    // Set nav height so the banner knows there's a nav on screen
    document.documentElement.style.setProperty('--bottom-nav-height', '88px');
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(88));
    document.documentElement.style.removeProperty('--bottom-nav-height');
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
    // Set nav height so the banner knows there's a nav on screen
    document.documentElement.style.setProperty('--bottom-nav-height', '88px');
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(88));
    document.documentElement.style.removeProperty('--bottom-nav-height');
  });

  // NOTE: drawer-suppress moved out of this component into the single
  // bannerController.setSuppressed path (driven by BannerCoordinatorMount), so
  // it covers BOTH banner owners (anchor + slot) uniformly. Coverage now lives
  // in BannerCoordinatorMount.test.tsx + bannerController.test.ts.

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

  it('requests the anchor on /multiplayer (lobby shows banner; gameplay/results suppressed via screen-fit-locked, not the route)', async () => {
    mockPathname.current = '/en/multiplayer';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(0));
    expect(clearRequest).not.toHaveBeenCalled();
  });

  it('clears the anchor on the classroom multiplayer lobby (child/education surface — ad-free)', async () => {
    mockPathname.current = '/en/multiplayer';
    window.history.replaceState({}, '', '/en/multiplayer?classroom=true');
    try {
      render(<AnchoredNativeBanner />);
      await Promise.resolve();
      expect(setRequest).not.toHaveBeenCalled();
      expect(clearRequest).toHaveBeenCalledWith('anchor');
    } finally {
      window.history.replaceState({}, '', '/');
    }
  });

  it('requests the anchor on /adventure (real ads during adventure gameplay)', async () => {
    mockPathname.current = '/adventure/boss-rush';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(0));
  });

  it('requests the anchor on the /daily hub (passive landing — pinned banner like home)', async () => {
    mockPathname.current = '/daily';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(0));
    expect(clearRequest).not.toHaveBeenCalled();
  });

  it('requests the anchor on the /brain hub (passive landing — pinned banner like home)', async () => {
    mockPathname.current = '/en/brain';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(setRequest).toHaveBeenCalledWith(...anchorReq(0));
    expect(clearRequest).not.toHaveBeenCalled();
  });

  it('clears the anchor on /brain/drills gameplay (banner must not cover play)', async () => {
    mockPathname.current = '/brain/drills/word-recall';
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
      // When navHeight=0 (nav explicitly hidden), margin should be 0, not safeBottom
      expect(setRequest).toHaveBeenCalledWith(...anchorReq(0));
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

  it('sticks to the bottom when no nav signal exists — settled path ignores the CSS fallback', async () => {
    // The CSS-default fallback (`calc(64px + safe)`) is an over-paint guard for
    // the FIRST synchronous frame only. Once layout has settled (observer/rAF),
    // an absent inline --bottom-nav-height means there is NO bottom nav at all,
    // so the banner must collapse to the bottom (Android margin = 0),
    // not float 64px up forever. Regression for "banner should stick to bottom
    // when there is no mobile bottom tab". The plugin's own safe-area handling
    // will position the banner correctly.
    mockPlatform.current = 'android';
    mockSafeArea.current = { top: 0, bottom: 24, left: 0, right: 0 };
    document.documentElement.style.removeProperty('--bottom-nav-height');
    const style = document.createElement('style');
    style.textContent = ':root { --bottom-nav-height: 96px; }';
    document.head.appendChild(style);
    try {
      render(<AnchoredNativeBanner />);
      await Promise.resolve();
      // Sync frame still uses the fallback (over-paint guard) — 96.
      expect(setRequest).toHaveBeenCalledWith(...anchorReq(96));

      // Settle: fire the <html> observer (no nav effect ever publishes a var).
      document.documentElement.classList.add('settle-tick');
      await new Promise((r) => setTimeout(r, 0));
      await Promise.resolve();
      // Settled path uses inline-or-zero → navHeight 0 → margin = 0 (let plugin handle safe-area).
      expect(setRequest).toHaveBeenLastCalledWith(...anchorReq(0));
    } finally {
      document.documentElement.classList.remove('settle-tick');
      document.head.removeChild(style);
    }
  });

  it('flags <html>.has-admob-banner while a banner occupies the bottom (SizeChanged > 0)', async () => {
    document.documentElement.classList.remove('has-admob-banner');
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    const sizeChanged = addListener.mock.calls.find((c) => c[0] === 'bannerAdSizeChanged');
    expect(sizeChanged).toBeTruthy();
    (sizeChanged![1] as (i: { height: number }) => void)({ height: 60 });
    expect(document.documentElement.classList.contains('has-admob-banner')).toBe(true);
    // Banner gone → flag cleared so content stops reserving the band.
    (sizeChanged![1] as (i: { height: number }) => void)({ height: 0 });
    expect(document.documentElement.classList.contains('has-admob-banner')).toBe(false);
  });

  it('clears has-admob-banner on FailedToLoad / Closed', async () => {
    document.documentElement.classList.add('has-admob-banner');
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    const failedCall = addListener.mock.calls.find((c) => c[0] === 'bannerAdFailedToLoad');
    (failedCall![1] as () => void)();
    expect(document.documentElement.classList.contains('has-admob-banner')).toBe(false);
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
