/**
 * The install prompt must never paint over a conversion surface (the Teacher Pro
 * upgrade page is the portfolio's only chargeable CTA — measured 2026-08-23, its
 * overlay intercepted the click outright).
 *
 * This asserts the RENDER-time guard specifically, not the effect-time one. The
 * effect-time check cannot hold on its own: this component mounts once at the
 * layout level, so a client-side navigation INTO the upgrade page never re-runs
 * its effect, and `beforeinstallprompt` fires long after mount. Only a guard
 * re-read on the render that would paint the overlay survives that.
 *
 * Deliberately drives the component through its real show path (a
 * beforeinstallprompt event plus the games-completed threshold) rather than
 * poking state, so it fails if that path stops being gated.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));
vi.mock('@/components/GoogleAnalytics', () => ({ gameEvents: { pwaInstalled: vi.fn() } }));
vi.mock('@/utils/platform', () => ({ isNative: () => false }));
// Past the "show after 2nd game" threshold, so the only thing standing between the
// beforeinstallprompt event and a visible overlay is the conversion-surface guard.
vi.mock('@/utils/gamesCompletedCount', () => ({ readGamesCompletedCount: () => 5 }));

/** Fire the real event the component listens for, then let its state settle. */
async function firePromptable() {
  await act(async () => {
    const e = new Event('beforeinstallprompt');
    // The handler calls preventDefault() and stores the event as the deferred prompt.
    Object.assign(e, { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'dismissed' }) });
    window.dispatchEvent(e);
  });
}

describe('PWAInstallPrompt on a conversion surface', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.classList.remove('conversion-surface');
    // Desktop Chrome UA: the Android and iOS branches both bail before the listener.
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      configurable: true,
    });
    window.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    document.body.classList.remove('conversion-surface');
  });

  it('renders the prompt when the page is NOT a conversion surface', async () => {
    const { PWAInstallPrompt } = await import('../PWAInstallPrompt');
    render(<PWAInstallPrompt />);
    await firePromptable();
    expect(screen.queryByText('pwa.installButton')).toBeInTheDocument();
  });

  it('renders nothing once conversion-surface is set AFTER mount (the client-nav case)', async () => {
    const { PWAInstallPrompt } = await import('../PWAInstallPrompt');
    render(<PWAInstallPrompt />);
    // Mounted clean — this is the layout-level component that never re-runs its effect.
    // The visitor then navigates into the upgrade page, which sets the class.
    document.body.classList.add('conversion-surface');
    await firePromptable();
    expect(screen.queryByText('pwa.installButton')).not.toBeInTheDocument();
  });
});
