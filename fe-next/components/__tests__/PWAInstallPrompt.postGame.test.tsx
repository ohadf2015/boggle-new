import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { resetOverlayQuietZoneForTests } from '@/lib/overlayQuietZone';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
const nav = { isInGame: false };
vi.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => ({ isInGame: nav.isInGame }),
}));
let mockPath = '/en';
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));
vi.mock('@/components/GoogleAnalytics', () => ({ gameEvents: { pwaInstalled: vi.fn() } }));
vi.mock('@/utils/platform', () => ({ isNative: () => false }));
let mockGames = 5;
vi.mock('@/utils/gamesCompletedCount', () => ({ readGamesCompletedCount: () => mockGames }));

async function firePromptable() {
  await act(async () => {
    const e = new Event('beforeinstallprompt');
    Object.assign(e, { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'dismissed' }) });
    window.dispatchEvent(e);
  });
}

async function finishGame(rerender: (ui: React.ReactElement) => void, Comp: React.ComponentType) {
  // A round ends: the count goes up, then the in-game flag drops and the tree re-renders.
  mockGames += 1;
  nav.isInGame = true;
  await act(async () => rerender(<Comp />));
  nav.isInGame = false;
  await act(async () => rerender(<Comp />));
}

describe('PWAInstallPrompt — only after a game finished this session', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    resetOverlayQuietZoneForTests();
    mockGames = 5;
    mockPath = '/en';
    nav.isInGame = false;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      configurable: true,
    });
    window.matchMedia = ((q: string) => ({
      matches: false, media: q, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  it('is absent on first paint for a returning player with many lifetime games', async () => {
    const { PWAInstallPrompt } = await import('../PWAInstallPrompt');
    render(<PWAInstallPrompt />);
    await firePromptable();
    expect(screen.queryByText('pwa.installButton')).not.toBeInTheDocument();
  });

  it('shows after a game finishes, once per session', async () => {
    const { PWAInstallPrompt } = await import('../PWAInstallPrompt');
    const { rerender, unmount } = render(<PWAInstallPrompt />);
    await firePromptable();
    await finishGame(rerender, PWAInstallPrompt);
    expect(screen.getByText('pwa.installButton')).toBeInTheDocument();
    // Writing the shown marker must not hide the prompt it just showed.
    await act(async () => rerender(<PWAInstallPrompt />));
    expect(screen.getByText('pwa.installButton')).toBeInTheDocument();

    unmount();
    render(<PWAInstallPrompt />);
    await firePromptable();
    expect(screen.queryByText('pwa.installButton')).not.toBeInTheDocument();
  });

  it('yields while the install pill is on screen, so two install pitches never stack', async () => {
    const pill = document.createElement('div');
    pill.setAttribute('data-install-pill', '');
    document.body.appendChild(pill);
    const { PWAInstallPrompt } = await import('../PWAInstallPrompt');
    const { rerender } = render(<PWAInstallPrompt />);
    await firePromptable();
    await finishGame(rerender, PWAInstallPrompt);
    expect(screen.queryByText('pwa.installButton')).not.toBeInTheDocument();
    pill.remove();
  });

  it('never shows on a play or results route, e.g. mid-WordCraft', async () => {
    mockPath = '/en/word-craft';
    const { PWAInstallPrompt } = await import('../PWAInstallPrompt');
    const { rerender } = render(<PWAInstallPrompt />);
    await firePromptable();
    await finishGame(rerender, PWAInstallPrompt);
    expect(screen.queryByText('pwa.installButton')).not.toBeInTheDocument();

    mockPath = '/en/singleplayer';
    await act(async () => rerender(<PWAInstallPrompt />));
    expect(screen.queryByText('pwa.installButton')).not.toBeInTheDocument();

    // Back on a menu page the deferred prompt lands.
    mockPath = '/en';
    await act(async () => rerender(<PWAInstallPrompt />));
    expect(screen.getByText('pwa.installButton')).toBeInTheDocument();
  });
});
