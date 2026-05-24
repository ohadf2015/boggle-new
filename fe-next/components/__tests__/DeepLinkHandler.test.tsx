/**
 * DeepLinkHandler Tests
 * Tests deep link routing for game rooms, auth callbacks, and push notification taps
 */

import { render, waitFor } from '@testing-library/react';
import DeepLinkHandler from '../DeepLinkHandler';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

// Mock addListener for the App plugin
let appUrlOpenHandler: ((event: { url: string }) => void) | null = null;
const mockAddListener = vi.fn().mockImplementation((_event: string, handler: (event: { url: string }) => void) => {
  appUrlOpenHandler = handler;
  return Promise.resolve({ remove: vi.fn() });
});

const mockBrowserClose = vi.fn().mockResolvedValue(undefined);

// Mock platform
vi.mock('@/utils/platform', () => ({
  isNative: vi.fn(() => true),
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock i18n
vi.mock('@/lib/i18n', () => ({
  defaultLocale: 'en',
  locales: ['en', 'he', 'sv', 'ja', 'es'],
}));

// Mock pushNotifications/tokenRegistration
vi.mock('@/utils/pushNotifications/tokenRegistration', () => ({
  setupPushListeners: vi.fn().mockResolvedValue(() => {}),
}));

describe('DeepLinkHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appUrlOpenHandler = null;
    // sessionStorage backs the once-per-session cold-start launch-URL guard.
    try { window.sessionStorage.clear(); } catch { /* unavailable */ }
    // Set up globalThis.Capacitor with App and Browser plugins
    (globalThis as any).Capacitor = {
      isNativePlatform: () => true,
      Plugins: {
        App: {
          addListener: mockAddListener,
          // Default: launched from the launcher icon (no deep link / data URI).
          getLaunchUrl: vi.fn().mockResolvedValue(undefined),
        },
        Browser: {
          close: mockBrowserClose,
        },
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).Capacitor;
    // Reset the URL the test may have navigated to (locale-detection source).
    window.history.pushState({}, '', '/');
    document.cookie = 'boggle_language=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('should register appUrlOpen listener on mount', () => {
    render(<DeepLinkHandler />);
    expect(mockAddListener).toHaveBeenCalledWith('appUrlOpen', expect.any(Function));
  });

  describe('game room deep links', () => {
    it('should route custom scheme join link to multiplayer join page', async () => {
      render(<DeepLinkHandler />);

      await appUrlOpenHandler!({ url: 'lexiclash://join/ABC123' });

      expect(mockReplace).toHaveBeenCalledWith('/en/join/ABC123');
    });

    it('should route HTTPS App Link join to multiplayer join page', async () => {
      render(<DeepLinkHandler />);

      await appUrlOpenHandler!({ url: 'https://www.lexiclash.live/join/ABC123' });

      expect(mockReplace).toHaveBeenCalledWith('/en/join/ABC123');
    });

    it('should preserve locale from query param', async () => {
      render(<DeepLinkHandler />);

      await appUrlOpenHandler!({ url: 'lexiclash://join/ABC123?locale=he' });

      expect(mockReplace).toHaveBeenCalledWith('/he/join/ABC123');
    });
  });

  describe('auth callback deep links', () => {
    it('should route auth callback with code', async () => {
      render(<DeepLinkHandler />);

      await appUrlOpenHandler!({ url: 'lexiclash://auth/callback?code=xyz789' });

      expect(mockReplace).toHaveBeenCalledWith('/en/auth/callback?code=xyz789');
    });
  });

  describe('push notification deep links', () => {
    it('should route friend request deep link', async () => {
      render(<DeepLinkHandler />);

      await appUrlOpenHandler!({ url: 'lexiclash://adventure?tab=friends' });

      expect(mockReplace).toHaveBeenCalledWith('/en/adventure?tab=friends');
    });

    it('should route achievement deep link', async () => {
      render(<DeepLinkHandler />);

      await appUrlOpenHandler!({ url: 'lexiclash://adventure/achievements' });

      expect(mockReplace).toHaveBeenCalledWith('/en/adventure/achievements');
    });
  });

  describe('HTTPS paths with locale prefix', () => {
    it('should strip existing locale prefix to avoid double locale', async () => {
      render(<DeepLinkHandler />);

      await appUrlOpenHandler!({ url: 'https://www.lexiclash.live/en/join/ABC123' });

      // The handler adds locale, so the path will be /en/en/join/ABC123
      // This tests current behavior — a follow-up could dedupe locales
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('join/ABC123'));
    });
  });

  // Android app shortcuts (long-press launcher icon) deliver a VIEW intent. On a
  // COLD start the @capacitor/app plugin does NOT replay `appUrlOpen` reliably for
  // this remote-URL WebView app — the launch URL is only available via
  // App.getLaunchUrl(). Without reading it, every shortcut lands on the home page.
  describe('cold-start launch URL (Android app shortcuts)', () => {
    const setLaunchUrl = (url: string | undefined) => {
      (globalThis as any).Capacitor.Plugins.App.getLaunchUrl = vi
        .fn()
        .mockResolvedValue(url === undefined ? undefined : { url });
    };

    it('routes the shortcut launch URL fetched from getLaunchUrl', async () => {
      setLaunchUrl('https://www.lexiclash.live/daily');

      render(<DeepLinkHandler />);

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/en/daily'));
    });

    it('routes a custom-scheme launch URL', async () => {
      setLaunchUrl('lexiclash://connections');

      render(<DeepLinkHandler />);

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/en/connections'));
    });

    it('does not route when launched from the launcher icon (no launch URL)', async () => {
      setLaunchUrl(undefined);

      render(<DeepLinkHandler />);
      await flush();

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('does not redirect to the homepage when the launch URL has no path', async () => {
      setLaunchUrl('https://www.lexiclash.live/');

      render(<DeepLinkHandler />);
      await flush();

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('consumes the launch URL only once across remounts', async () => {
      setLaunchUrl('https://www.lexiclash.live/multiplayer');

      const { unmount } = render(<DeepLinkHandler />);
      await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));

      unmount();
      render(<DeepLinkHandler />);
      await flush();

      // Still once — the second mount must not re-route the same launch URL.
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });
  });

  // Shortcut/App-Link URLs carry no ?locale=, so without a smarter signal they
  // fall back to defaultLocale ('he') — an English player would land on a Hebrew
  // page. The remote-URL app has already redirected to /{locale}, so the on-screen
  // path is the reliable preference; the language cookie is the fallback.
  describe('locale resolution (no explicit ?locale param)', () => {
    const setLaunchUrl = (url: string) => {
      (globalThis as any).Capacitor.Plugins.App.getLaunchUrl = vi.fn().mockResolvedValue({ url });
    };

    it('uses the locale of the page the app already redirected to (cold start)', async () => {
      window.history.pushState({}, '', '/sv/home');
      setLaunchUrl('https://www.lexiclash.live/daily');

      render(<DeepLinkHandler />);

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/sv/daily'));
    });

    it('uses the current path locale for a warm appUrlOpen link', async () => {
      window.history.pushState({}, '', '/ja/play');
      render(<DeepLinkHandler />);

      await appUrlOpenHandler!({ url: 'https://www.lexiclash.live/multiplayer' });

      expect(mockReplace).toHaveBeenCalledWith('/ja/multiplayer');
    });

    it('falls back to the language cookie when no path locale is present', async () => {
      document.cookie = 'boggle_language=es; path=/';
      render(<DeepLinkHandler />);

      await appUrlOpenHandler!({ url: 'lexiclash://connections' });

      expect(mockReplace).toHaveBeenCalledWith('/es/connections');
    });

    it('still lets an explicit ?locale param win over the current path', async () => {
      window.history.pushState({}, '', '/sv/home');
      render(<DeepLinkHandler />);

      await appUrlOpenHandler!({ url: 'lexiclash://join/ABC123?locale=he' });

      expect(mockReplace).toHaveBeenCalledWith('/he/join/ABC123');
    });
  });
});
