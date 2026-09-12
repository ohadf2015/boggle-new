/**
 * The install banner must obey the overlay quiet zone, not just `isInGame`.
 *
 * `isInGame` is the NavigationContext flag, and it is false exactly where this
 * piece hurts: the classroom round-end recap and the projector results live on
 * `/multiplayer`, which is deliberately not a game route. The quiet zone is the
 * signal a surface raises for itself, so a `fixed bottom-4 z-[100]` banner can
 * never land on a podium again.
 *
 * Driven through the real show path (a beforeinstallprompt event past the
 * games-completed threshold), so it fails if that path stops being gated.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  OVERLAY_QUIET_ZONE_GRACE_MS,
  claimOverlayQuietZone,
  resetOverlayQuietZoneForTests,
} from '@/lib/overlayQuietZone';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => ({
    isInGame: false,
    setIsInGame: vi.fn(),
    activeTab: 'home',
    setActiveTab: vi.fn(),
    headerAudioControlActive: false,
    registerHeaderAudioControl: () => () => {},
  }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));
vi.mock('@/components/GoogleAnalytics', () => ({ gameEvents: { pwaInstalled: vi.fn() } }));
vi.mock('@/utils/platform', () => ({ isNative: () => false }));
vi.mock('@/utils/gamesCompletedCount', () => ({ readGamesCompletedCount: () => 5 }));

async function firePromptable() {
  await act(async () => {
    const e = new Event('beforeinstallprompt');
    Object.assign(e, { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'dismissed' }) });
    window.dispatchEvent(e);
  });
}

describe('PWAInstallPrompt — overlay quiet zone', () => {
  beforeEach(() => {
    localStorage.clear();
    resetOverlayQuietZoneForTests();
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
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
    resetOverlayQuietZoneForTests();
  });

  it('renders the banner when nothing is being covered (control)', async () => {
    const { PWAInstallPrompt } = await import('../PWAInstallPrompt');
    render(<PWAInstallPrompt />);
    await firePromptable();
    expect(screen.queryByText('pwa.installButton')).toBeInTheDocument();
  });

  it('renders nothing while a round-end recap owns the screen', async () => {
    const { PWAInstallPrompt } = await import('../PWAInstallPrompt');
    render(<PWAInstallPrompt />);
    // The visitor reaches the recap AFTER this layout-level component mounted —
    // the same client-nav case the conversion-surface guard exists for.
    const release = claimOverlayQuietZone('classroom-results');
    await firePromptable();
    expect(screen.queryByText('pwa.installButton')).not.toBeInTheDocument();
    release();
  });

  it('comes back once the zone clears — deferred, not dropped', async () => {
    vi.useFakeTimers();
    const { PWAInstallPrompt } = await import('../PWAInstallPrompt');
    render(<PWAInstallPrompt />);
    const release = claimOverlayQuietZone('classroom-results');
    await firePromptable();
    expect(screen.queryByText('pwa.installButton')).not.toBeInTheDocument();

    await act(async () => {
      release();
      vi.advanceTimersByTime(OVERLAY_QUIET_ZONE_GRACE_MS + 100);
    });

    expect(screen.queryByText('pwa.installButton')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
