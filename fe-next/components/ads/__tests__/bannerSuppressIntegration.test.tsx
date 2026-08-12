/**
 * Banner suppress/restore — end-to-end integration over the REAL bannerController
 * + BannerCoordinatorMount + AnchoredNativeBanner (only the native plugin +
 * useAdMob are mocked).
 *
 * Guards the device-confirmed bug chain:
 * 1. Opening the side menu (html.mobile-drawer-open) must HIDE the banner.
 * 2. Closing it must bring the banner back — and the re-show must first call
 *    AdMob.resumeBanner(), because the native re-show path (updateExistingAdView)
 *    does NOT restore visibility after hideBanner() set the view GONE. Without
 *    resume, the banner would stay hidden after closing the menu.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const showBannerSpy = vi.fn().mockResolvedValue(undefined);
const hideBannerSpy = vi.fn().mockResolvedValue(undefined);
const resumeBannerSpy = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({
    showBanner: (...args: unknown[]) => showBannerSpy(...args),
    hideBanner: (...args: unknown[]) => hideBannerSpy(...args),
  }),
}));

const admobListeners: Record<string, Array<() => void>> = {};
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, isPluginAvailable: () => true, getPlatform: () => 'android' },
}));

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    addListener: async (evt: string, cb: () => void) => {
      (admobListeners[evt] ??= []).push(cb);
      return { remove: vi.fn() };
    },
    resumeBanner: (...args: unknown[]) => resumeBannerSpy(...args),
  },
  BannerAdPluginEvents: {
    Loaded: 'bannerAdLoaded',
    SizeChanged: 'bannerAdSizeChanged',
    FailedToLoad: 'bannerAdFailedToLoad',
  },
  BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
}));

vi.mock('@/hooks/useAppLifecycle', () => ({ useAppLifecycle: () => {} }));
vi.mock('@/hooks/useSafeArea', () => ({ useSafeArea: () => ({ bottom: 0 }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/he' }));

describe('Banner suppress/restore — integration', () => {
  beforeEach(() => {
    vi.resetModules();
    showBannerSpy.mockClear();
    hideBannerSpy.mockClear();
    resumeBannerSpy.mockClear();
    document.documentElement.classList.remove('mobile-drawer-open');
    document.documentElement.style.setProperty('--bottom-nav-height', '0px');
    for (const k of Object.keys(admobListeners)) delete admobListeners[k];
  });

  afterEach(() => {
    document.documentElement.classList.remove('mobile-drawer-open');
    document.documentElement.classList.remove('modal-open');
  });

  it('hides on drawer open and restores (resume + show) on drawer close', async () => {
    const BannerCoordinatorMount = (await import('../BannerCoordinatorMount')).default;
    const AnchoredNativeBanner = (await import('../AnchoredNativeBanner')).default;
    const { bannerController } = await import('@/lib/native/bannerController');

    render(
      <>
        <BannerCoordinatorMount />
        <AnchoredNativeBanner />
      </>,
    );

    // Initial show fires (anchor registers its request).
    await waitFor(() => expect(showBannerSpy).toHaveBeenCalled(), { timeout: 5000 });
    hideBannerSpy.mockClear();
    showBannerSpy.mockClear();
    resumeBannerSpy.mockClear();

    // Drawer opens → suppress → native hide. Poll: the MutationObserver that
    // detects the class and the controller's serialized queue both resolve
    // asynchronously, and a single flush can race them under CI load.
    document.documentElement.classList.add('mobile-drawer-open');
    await waitFor(() => expect(hideBannerSpy).toHaveBeenCalled(), { timeout: 5000 });

    // Drawer closes → release → banner returns, visibility restored FIRST.
    document.documentElement.classList.remove('mobile-drawer-open');
    await waitFor(() => {
      expect(resumeBannerSpy).toHaveBeenCalled(); // un-hide the GONE AdView
      expect(showBannerSpy).toHaveBeenCalled();
    }, { timeout: 5000 });
  });

  it('hides while a modal is open (html.modal-open) and restores when it closes', async () => {
    const BannerCoordinatorMount = (await import('../BannerCoordinatorMount')).default;
    const AnchoredNativeBanner = (await import('../AnchoredNativeBanner')).default;
    const { bannerController } = await import('@/lib/native/bannerController');

    render(
      <>
        <BannerCoordinatorMount />
        <AnchoredNativeBanner />
      </>,
    );

    await waitFor(() => expect(showBannerSpy).toHaveBeenCalled(), { timeout: 5000 });
    hideBannerSpy.mockClear();
    showBannerSpy.mockClear();
    resumeBannerSpy.mockClear();

    // A dialog opens (the shared DialogContent ref-counts this class) → suppress.
    document.documentElement.classList.add('modal-open');
    await waitFor(() => expect(hideBannerSpy).toHaveBeenCalled(), { timeout: 5000 });

    // Dialog closes → banner returns (visibility restored first, then re-show).
    document.documentElement.classList.remove('modal-open');
    await waitFor(() => {
      expect(resumeBannerSpy).toHaveBeenCalled();
      expect(showBannerSpy).toHaveBeenCalled();
    }, { timeout: 5000 });
  });

  it('hides while the feedback widget modal is open (html.fdw-modal-open)', async () => {
    // Player report 2026-08-12: "the add hides part of the report bug form".
    // The widget lives in a shadow root, so it can't use DialogContent's
    // ref-counted `modal-open` — it sets its own class instead.
    const BannerCoordinatorMount = (await import('../BannerCoordinatorMount')).default;
    const AnchoredNativeBanner = (await import('../AnchoredNativeBanner')).default;

    render(
      <>
        <BannerCoordinatorMount />
        <AnchoredNativeBanner />
      </>,
    );

    await waitFor(() => expect(showBannerSpy).toHaveBeenCalled(), { timeout: 5000 });
    hideBannerSpy.mockClear();
    showBannerSpy.mockClear();
    resumeBannerSpy.mockClear();

    document.documentElement.classList.add('fdw-modal-open');
    await waitFor(() => expect(hideBannerSpy).toHaveBeenCalled(), { timeout: 5000 });

    document.documentElement.classList.remove('fdw-modal-open');
    await waitFor(() => {
      expect(resumeBannerSpy).toHaveBeenCalled();
      expect(showBannerSpy).toHaveBeenCalled();
    }, { timeout: 5000 });
  });
});
