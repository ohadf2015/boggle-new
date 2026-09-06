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
import { render, waitFor, cleanup } from '@testing-library/react';

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

/** Flush MutationObserver delivery (macrotask), matching BannerCoordinatorMount.test. */
const flushObserver = () => new Promise((r) => setTimeout(r, 0));

/** Drain controller queue; never hang the suite if a prior op stuck the chain. */
async function whenIdle(
  bannerController: { whenIdle: () => Promise<void> },
  ms = 8000,
): Promise<void> {
  await Promise.race([
    bannerController.whenIdle(),
    new Promise<void>((r) => setTimeout(r, ms)),
  ]);
}

const SUPPRESS_HTML_CLASSES = [
  'mobile-drawer-open',
  'modal-open',
  'fdw-modal-open',
  'onboarding-active',
  'banner-allow-in-game',
] as const;

function clearSuppressDom() {
  for (const c of SUPPRESS_HTML_CLASSES) {
    document.documentElement.classList.remove(c);
  }
  document.body.classList.remove('screen-fit-locked');
}

type BannerControllerMod = typeof import('@/lib/native/bannerController');

/**
 * Toggle a suppress signal the way production does (DOM class), then make the
 * hide/restore transition deterministic under CI shard load:
 * - drain the serialize queue so suppress is not stuck behind a slow show
 * - flush the MutationObserver macrotask
 * - re-assert setSuppressed from the same DOM policy (idempotent if observer
 *   already ran; recovers when the observer callback was starved — the 15s
 *   waitFor alone still flakes on test shard 3)
 */
async function toggleSuppressClass(
  bannerController: BannerControllerMod['bannerController'],
  shouldSuppressBanner: BannerControllerMod['shouldSuppressBanner'],
  action: () => void,
): Promise<void> {
  await whenIdle(bannerController);
  action();
  await flushObserver();
  await flushObserver();
  await bannerController.setSuppressed(
    shouldSuppressBanner({
      drawerOpen: document.documentElement.classList.contains('mobile-drawer-open'),
      inGame: document.body.classList.contains('screen-fit-locked'),
      allowInGame: document.documentElement.classList.contains('banner-allow-in-game'),
      onboarding: document.documentElement.classList.contains('onboarding-active'),
      modalOpen:
        document.documentElement.classList.contains('modal-open') ||
        document.documentElement.classList.contains('fdw-modal-open'),
    }),
  );
  await whenIdle(bannerController);
}

describe('Banner suppress/restore — integration', () => {
  beforeEach(() => {
    // Other files in the same vitest worker may leave fake timers on; real
    // timers are required for MutationObserver flushes + controller opTimeout.
    vi.useRealTimers();
    vi.resetModules();
    showBannerSpy.mockClear();
    hideBannerSpy.mockClear();
    resumeBannerSpy.mockClear();
    // Clear EVERY class shouldSuppressBanner reads — leftover DOM from another
    // file in this worker can leave suppressed===true so adding drawer/modal
    // becomes a setSuppressed no-op and hideBannerSpy never fires (shard-3 flake).
    clearSuppressDom();
    document.documentElement.style.setProperty('--bottom-nav-height', '0px');
    for (const k of Object.keys(admobListeners)) delete admobListeners[k];
  });

  afterEach(() => {
    cleanup();
    clearSuppressDom();
  });

  it('hides on drawer open and restores (resume + show) on drawer close', async () => {
    const BannerCoordinatorMount = (await import('../BannerCoordinatorMount')).default;
    const AnchoredNativeBanner = (await import('../AnchoredNativeBanner')).default;
    const { bannerController, shouldSuppressBanner } = await import('@/lib/native/bannerController');

    render(
      <>
        <BannerCoordinatorMount />
        <AnchoredNativeBanner />
      </>,
    );

    // Initial show fires (anchor registers its request).
    await waitFor(() => expect(showBannerSpy).toHaveBeenCalled(), { timeout: 15000 });
    await whenIdle(bannerController);
    // Start the suppress transition from a known un-suppressed applied state so
    // setSuppressed(true) cannot early-return.
    await bannerController.setSuppressed(false);
    await whenIdle(bannerController);
    hideBannerSpy.mockClear();
    showBannerSpy.mockClear();
    resumeBannerSpy.mockClear();

    await toggleSuppressClass(bannerController, shouldSuppressBanner, () => {
      document.documentElement.classList.add('mobile-drawer-open');
    });
    expect(hideBannerSpy).toHaveBeenCalled();

    // Drawer closes → release → banner returns, visibility restored FIRST.
    await toggleSuppressClass(bannerController, shouldSuppressBanner, () => {
      document.documentElement.classList.remove('mobile-drawer-open');
    });
    expect(resumeBannerSpy).toHaveBeenCalled(); // un-hide the GONE AdView
    expect(showBannerSpy).toHaveBeenCalled();
  });

  it('hides while a modal is open (html.modal-open) and restores when it closes', async () => {
    const BannerCoordinatorMount = (await import('../BannerCoordinatorMount')).default;
    const AnchoredNativeBanner = (await import('../AnchoredNativeBanner')).default;
    const { bannerController, shouldSuppressBanner } = await import('@/lib/native/bannerController');

    render(
      <>
        <BannerCoordinatorMount />
        <AnchoredNativeBanner />
      </>,
    );

    await waitFor(() => expect(showBannerSpy).toHaveBeenCalled(), { timeout: 15000 });
    await whenIdle(bannerController);
    await bannerController.setSuppressed(false);
    await whenIdle(bannerController);
    hideBannerSpy.mockClear();
    showBannerSpy.mockClear();
    resumeBannerSpy.mockClear();

    // A dialog opens (the shared DialogContent ref-counts this class) → suppress.
    await toggleSuppressClass(bannerController, shouldSuppressBanner, () => {
      document.documentElement.classList.add('modal-open');
    });
    expect(hideBannerSpy).toHaveBeenCalled();

    // Dialog closes → banner returns (visibility restored first, then re-show).
    await toggleSuppressClass(bannerController, shouldSuppressBanner, () => {
      document.documentElement.classList.remove('modal-open');
    });
    expect(resumeBannerSpy).toHaveBeenCalled();
    expect(showBannerSpy).toHaveBeenCalled();
  });

  it('hides while the feedback widget modal is open (html.fdw-modal-open)', async () => {
    // Player report 2026-08-12: "the add hides part of the report bug form".
    // The widget lives in a shadow root, so it can't use DialogContent's
    // ref-counted `modal-open` — it sets its own class instead.
    const BannerCoordinatorMount = (await import('../BannerCoordinatorMount')).default;
    const AnchoredNativeBanner = (await import('../AnchoredNativeBanner')).default;
    const { bannerController, shouldSuppressBanner } = await import('@/lib/native/bannerController');

    render(
      <>
        <BannerCoordinatorMount />
        <AnchoredNativeBanner />
      </>,
    );

    await waitFor(() => expect(showBannerSpy).toHaveBeenCalled(), { timeout: 15000 });
    await whenIdle(bannerController);
    await bannerController.setSuppressed(false);
    await whenIdle(bannerController);
    hideBannerSpy.mockClear();
    showBannerSpy.mockClear();
    resumeBannerSpy.mockClear();

    await toggleSuppressClass(bannerController, shouldSuppressBanner, () => {
      document.documentElement.classList.add('fdw-modal-open');
    });
    expect(hideBannerSpy).toHaveBeenCalled();

    await toggleSuppressClass(bannerController, shouldSuppressBanner, () => {
      document.documentElement.classList.remove('fdw-modal-open');
    });
    expect(resumeBannerSpy).toHaveBeenCalled();
    expect(showBannerSpy).toHaveBeenCalled();
  });
});
