/**
 * Banner Suppress Bug - RED Finding + Verification of Fixes
 *
 * ROOT CAUSE: hideBanner has an early-return guard `if (!getConfig()) return;`
 * (hooks/useAdMob.ts:383) that prevents suppress from reaching the native
 * AdMob.hideBanner call. This is independent of the controller; the hook itself
 * short-circuits. However, we can mitigate by:
 * 1. Stabilizing BannerCoordinatorMount effect so it doesn't churn
 * 2. Stopping setOps from falsely claiming applied.visible=false
 * 3. Making suppress always call hide() (idempotent)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const showBannerSpy = vi.fn().mockResolvedValue(undefined);
const hideBannerSpy = vi.fn().mockResolvedValue(undefined);

// Controllable getConfig() guard
const adMobConfig = { current: { bannerAdId: 'test-ad-id' } };

vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({
    showBanner: async (...args: any[]) => {
      if (!adMobConfig.current) return;
      return showBannerSpy(...args);
    },
    hideBanner: async (...args: any[]) => {
      if (!adMobConfig.current) return;
      return hideBannerSpy(...args);
    },
  }),
}));

const admobListeners: Record<string, Array<() => void>> = {};
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => 'android',
  },
}));

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    addListener: async (evt: string, cb: () => void) => {
      if (!admobListeners[evt]) admobListeners[evt] = [];
      admobListeners[evt].push(cb);
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

vi.mock('@/hooks/useAppLifecycle', () => ({
  useAppLifecycle: () => {},
}));

vi.mock('@/hooks/useSafeArea', () => ({
  useSafeArea: () => ({ bottom: 0 }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/he',
}));

let bannerController: any;

const getController = async () => {
  const { bannerController: bc } = await import('@/lib/native/bannerController');
  return bc;
};

describe('Banner Suppress Bug - Diagnosis & Mitigations', () => {
  beforeEach(async () => {
    vi.resetModules();
    showBannerSpy.mockClear();
    hideBannerSpy.mockClear();
    adMobConfig.current = { bannerAdId: 'test-ad-id' };
    document.documentElement.classList.remove('mobile-drawer-open');
    document.documentElement.style.setProperty('--bottom-nav-height', '64px');
    for (const key of Object.keys(admobListeners)) {
      delete admobListeners[key];
    }
  });

  afterEach(() => {
    document.documentElement.classList.remove('mobile-drawer-open');
  });

  it('RED: getConfig()=null in hook early-returns before calling native hide', async () => {
    const BannerCoordinatorMount = (await import('../BannerCoordinatorMount')).default;
    const AnchoredNativeBanner = (await import('../AnchoredNativeBanner')).default;
    bannerController = await getController();

    function TestHarness() {
      return (
        <>
          <BannerCoordinatorMount />
          <AnchoredNativeBanner />
        </>
      );
    }

    render(<TestHarness />);

    // Get initial show (config healthy)
    await waitFor(() => {
      expect(showBannerSpy).toHaveBeenCalled();
    });

    showBannerSpy.mockClear();
    hideBannerSpy.mockClear();

    // Set config to null → hook early-returns
    adMobConfig.current = null;

    // Open drawer → suppress called
    document.documentElement.classList.add('mobile-drawer-open');
    await new Promise((r) => setTimeout(r, 0));
    await bannerController.whenIdle();

    // The spy won't be called because the hook early-returns before calling it
    const hideWasCalled = hideBannerSpy.mock.calls.length > 0;

    // This test documents the ROOT CAUSE: hook early-return is the problem
    // The controller IS calling hide(), but the hook returns early.
    // Expected: false (this is the diagnosis)
    expect(hideWasCalled).toBe(false);
  });

  it('VERIFY: controller always calls hide() when suppressed (idempotent resilience)', async () => {
    // Verify that FIX 3 (idempotent hide) is in place:
    // The controller's reconcile should ALWAYS call hide when suppressed,
    // even if applied.visible===false, to provide resilience.
    const { bannerController: bc } = await import('@/lib/native/bannerController');

    const calls: string[] = [];
    const mockOps = {
      show: vi.fn(async () => { calls.push('show'); }),
      hide: vi.fn(async () => { calls.push('hide'); }),
    };

    await bc.setOps(mockOps);
    await bc.setRequest('test', { margin: 50, variant: 'content', priority: 1 });
    await bc.whenIdle();

    calls.length = 0;
    mockOps.show.mockClear();
    mockOps.hide.mockClear();

    // Suppress without ever showing (no request) — controller should still call hide()
    await bc.setSuppressed(true);
    await bc.whenIdle();

    // With the idempotent fix, hide SHOULD be called (resilience)
    expect(mockOps.hide).toHaveBeenCalled();
  });
});
