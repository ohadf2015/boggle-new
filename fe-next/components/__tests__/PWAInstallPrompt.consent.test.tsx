/**
 * The PWA install overlay must not paint while cookie consent is unresolved.
 * Same coordination rule as EmailCaptureModal / AndroidAppInstallPromo: a
 * z-[100] banner over the z-[110] cookie sheet (or a competing overlay) makes
 * ACCEPT ALL hard to click on first visit.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

let mockConsentDecided = false;
vi.mock('@/hooks/useConsentDecided', () => ({
  useConsentDecided: () => mockConsentDecided,
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
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

describe('PWAInstallPrompt — cookie consent gate', () => {
  beforeEach(() => {
    mockConsentDecided = false;
    localStorage.clear();
    document.body.classList.remove('conversion-surface');
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

  it('renders nothing while consent is unresolved, even after beforeinstallprompt', async () => {
    mockConsentDecided = false;
    const { PWAInstallPrompt } = await import('../PWAInstallPrompt');
    render(<PWAInstallPrompt />);
    await firePromptable();
    expect(screen.queryByText('pwa.installButton')).not.toBeInTheDocument();
  });

  it('renders the prompt once consent is decided', async () => {
    mockConsentDecided = true;
    const { PWAInstallPrompt } = await import('../PWAInstallPrompt');
    render(<PWAInstallPrompt />);
    await firePromptable();
    expect(screen.queryByText('pwa.installButton')).toBeInTheDocument();
  });
});
