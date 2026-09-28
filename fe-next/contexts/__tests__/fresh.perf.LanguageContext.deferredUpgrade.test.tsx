/**
 * Piece D (perf), SPEC section 10 item 2: a fresh visitor on the landing
 * subset must not download the full catalogue chunk (~150KB br) during first
 * load. The upgrade used to fire on idle (<=4s), i.e. always inside the first
 * load. It now fires on first engagement (pointerdown / keydown / touchstart /
 * scroll) or on the first client navigation, whichever comes first. The
 * homepage itself only uses subset namespaces (lib/i18n/landingNamespaces.ts).
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { PARTIAL_FLAG } from '@/lib/i18n/pickLandingMessages';

let pathname = '/en';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => pathname,
}));
vi.mock('@/utils/logger', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));
vi.mock('@/utils/sentry', () => ({ trackTelemetryEvent: vi.fn() }));

const PARTIAL = { [PARTIAL_FLAG]: true, direction: 'ltr', flag: 'x', nav: { home: 'Home' } };
const FULL = { direction: 'ltr', flag: 'x', nav: { home: 'Home' }, multiplayerFlow: { t: 'Create' } };

const loadTranslation = vi.fn(async () => FULL);
vi.mock('../../translations/loadTranslation', () => ({
  loadTranslation: (...a: unknown[]) => loadTranslation(...(a as [])),
  getCachedTranslation: vi.fn(() => PARTIAL),
  seedTranslationCache: vi.fn(),
}));

import { LanguageProvider } from '../LanguageContext';

const renderProvider = () =>
  render(
    <LanguageProvider initialLanguage="en">
      <span />
    </LanguageProvider>,
  );

describe('landing subset: full catalogue waits for first engagement', () => {
  // r4 defers the fullscreen-route upgrade behind two chained rAFs
  // (after-first-paint). Capture the callbacks in a registry and invoke them
  // explicitly per test wave: mapping rAF onto sinon's fake setTimeout makes
  // cleanup blow up ("timer created with setTimeout() but cleared with
  // cancelAnimationFrame()") because LanguageContext's effect cleanup always
  // calls cancelAnimationFrame, and stub/unstub ordering vs the auto-cleanup
  // hook is not something this test should depend on.
  let rafCallbacks: FrameRequestCallback[] = [];
  const runRafWave = () => {
    const wave = rafCallbacks.splice(0);
    wave.forEach((cb) => cb(0));
  };
  beforeEach(() => {
    vi.useFakeTimers();
    rafCallbacks = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    loadTranslation.mockClear();
    pathname = '/en';
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shouldNotFetchTheFullCatalogueWhileTheVisitorIsIdle', () => {
    // GIVEN a fresh visitor booted on the landing subset
    renderProvider();
    // WHEN nothing happens for 30s (the first-load window and well beyond)
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    // THEN the full catalogue chunk was never requested
    expect(loadTranslation).not.toHaveBeenCalled();
  });

  it.each(['pointerdown', 'keydown', 'touchstart', 'scroll'])(
    'shouldUpgradeOnTheFirst %s',
    (type) => {
      renderProvider();
      act(() => {
        window.dispatchEvent(new Event(type));
      });
      expect(loadTranslation).toHaveBeenCalledTimes(1);
    },
  );

  it('shouldUpgradeOnTheFirstClientNavigation', () => {
    // GIVEN the subset booted on /en
    const view = renderProvider();
    expect(loadTranslation).not.toHaveBeenCalled();
    // WHEN a programmatic client navigation lands on another route
    pathname = '/en/multiplayer';
    view.rerender(
      <LanguageProvider initialLanguage="en">
        <span />
      </LanguageProvider>,
    );
    // THEN the full catalogue is fetched for the new page
    expect(loadTranslation).toHaveBeenCalledTimes(1);
  });

  it('shouldNotUpgradeSynchronouslyOnAFullscreenGameRoute', () => {
    pathname = '/en/singleplayer';
    renderProvider();
    expect(loadTranslation).not.toHaveBeenCalled();
  });

  it('shouldUpgradeAfterFirstPaintOnAFullscreenGameRoute', () => {
    pathname = '/en/singleplayer';
    renderProvider();
    // Two chained rAFs = after first paint: the outer frame schedules the
    // inner one, so flush one wave at a time.
    act(() => {
      runRafWave();
      runRafWave();
    });
    expect(loadTranslation).toHaveBeenCalledTimes(1);
  });
});
