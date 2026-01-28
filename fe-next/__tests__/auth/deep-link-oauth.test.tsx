/**
 * Test: Deep Link OAuth Callback Handler
 *
 * Verifies that the app correctly handles OAuth callbacks via deep links
 * on mobile (Capacitor) platforms, redirecting users back to the app
 * instead of keeping them in the browser.
 */

import { render, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import DeepLinkHandler from '@/components/DeepLinkHandler';
import * as platform from '@/utils/platform';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock Capacitor App plugin
jest.mock('@capacitor/app', () => ({
  App: {
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
}));

// Mock Capacitor Browser plugin
jest.mock('@capacitor/browser', () => ({
  Browser: {
    close: jest.fn(),
    open: jest.fn(),
  },
}));

// Mock platform utils
jest.mock('@/utils/platform', () => ({
  isNative: jest.fn(),
}));

// Mock logger
jest.mock('@/utils/logger', () => {
  const mockLog = jest.fn();
  const mockError = jest.fn();
  return {
    __esModule: true,
    default: {
      log: mockLog,
      error: mockError,
      warn: jest.fn(),
    },
  };
});

describe('Deep Link OAuth Callback Handler', () => {
  let mockRouter: { replace: jest.Mock };
  let mockAddListener: jest.Mock;
  let mockRemove: jest.Mock;
  const mockIsNative = platform.isNative as jest.Mock;

  beforeEach(() => {
    mockRouter = {
      replace: jest.fn(),
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    mockRemove = jest.fn();
    mockAddListener = App.addListener as jest.Mock;
    mockAddListener.mockClear();
    mockAddListener.mockResolvedValue({ remove: mockRemove });

    // Default to native environment
    mockIsNative.mockReturnValue(true);

    // Reset Browser mock
    (Browser.close as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register deep link handler when component mounts', async () => {
    // GIVEN: Component that sets up deep link handling
    // WHEN: Component renders
    render(<DeepLinkHandler />);

    // THEN: Should have registered appUrlOpen listener
    await waitFor(() => {
      expect(mockAddListener).toHaveBeenCalledWith(
        'appUrlOpen',
        expect.any(Function)
      );
    });
  });

  it('should handle OAuth callback deep link and redirect to auth/callback page', async () => {
    // GIVEN: Deep link with OAuth callback URL
    const deepLinkUrl = 'lexiclash://auth/callback?code=test-code-123&locale=en';

    // Store the listener callback
    let appUrlOpenCallback: ((event: { url: string }) => void) | null = null;
    mockAddListener.mockImplementation((event: string, callback: (event: { url: string }) => void) => {
      if (event === 'appUrlOpen') {
        appUrlOpenCallback = callback;
      }
      return Promise.resolve({ remove: mockRemove });
    });

    render(<DeepLinkHandler />);

    // WHEN: Deep link event is fired with OAuth callback URL
    if (appUrlOpenCallback) {
      (appUrlOpenCallback as (event: { url: string }) => void)({ url: deepLinkUrl });
    }

    // THEN: Should redirect to auth callback page with query params
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(
        '/en/auth/callback?code=test-code-123'
      );
    });
  });

  it('should extract locale from deep link URL and use it in redirect', async () => {
    // GIVEN: Deep link with Swedish locale
    const deepLinkUrl = 'lexiclash://auth/callback?code=test-code&locale=sv';

    let appUrlOpenCallback: ((event: { url: string }) => void) | null = null;
    mockAddListener.mockImplementation((event: string, callback: (event: { url: string }) => void) => {
      if (event === 'appUrlOpen') {
        appUrlOpenCallback = callback;
      }
      return Promise.resolve({ remove: mockRemove });
    });

    render(<DeepLinkHandler />);

    // WHEN: Deep link event is fired
    if (appUrlOpenCallback) {
      (appUrlOpenCallback as (event: { url: string }) => void)({ url: deepLinkUrl });
    }

    // THEN: Should redirect to Swedish locale auth callback
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(
        '/sv/auth/callback?code=test-code'
      );
    });
  });

  it('should default to Hebrew locale if none specified in deep link', async () => {
    // GIVEN: Deep link without locale parameter
    const deepLinkUrl = 'lexiclash://auth/callback?code=test-code';

    let appUrlOpenCallback: ((event: { url: string }) => void) | null = null;
    mockAddListener.mockImplementation((event: string, callback: (event: { url: string }) => void) => {
      if (event === 'appUrlOpen') {
        appUrlOpenCallback = callback;
      }
      return Promise.resolve({ remove: mockRemove });
    });

    render(<DeepLinkHandler />);

    // WHEN: Deep link event is fired
    if (appUrlOpenCallback) {
      (appUrlOpenCallback as (event: { url: string }) => void)({ url: deepLinkUrl });
    }

    // THEN: Should default to Hebrew locale (defaultLocale = 'he')
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(
        '/he/auth/callback?code=test-code'
      );
    });
  });

  it('should preserve all OAuth query parameters in redirect', async () => {
    // GIVEN: Deep link with multiple OAuth parameters
    const deepLinkUrl = 'lexiclash://auth/callback?code=test-code&state=state123&locale=ja';

    let appUrlOpenCallback: ((event: { url: string }) => void) | null = null;
    mockAddListener.mockImplementation((event: string, callback: (event: { url: string }) => void) => {
      if (event === 'appUrlOpen') {
        appUrlOpenCallback = callback;
      }
      return Promise.resolve({ remove: mockRemove });
    });

    render(<DeepLinkHandler />);

    // WHEN: Deep link event is fired
    if (appUrlOpenCallback) {
      (appUrlOpenCallback as (event: { url: string }) => void)({ url: deepLinkUrl });
    }

    // THEN: Should preserve all OAuth params except locale
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(
        '/ja/auth/callback?code=test-code&state=state123'
      );
    });
  });

  it('should handle non-auth deep links gracefully', async () => {
    // GIVEN: Deep link to a different route
    const deepLinkUrl = 'lexiclash://multiplayer/room/test-room';

    let appUrlOpenCallback: ((event: { url: string }) => void) | null = null;
    mockAddListener.mockImplementation((event: string, callback: (event: { url: string }) => void) => {
      if (event === 'appUrlOpen') {
        appUrlOpenCallback = callback;
      }
      return Promise.resolve({ remove: mockRemove });
    });

    render(<DeepLinkHandler />);

    // WHEN: Deep link event is fired
    if (appUrlOpenCallback) {
      (appUrlOpenCallback as (event: { url: string }) => void)({ url: deepLinkUrl });
    }

    // THEN: Should redirect to the correct route (defaults to Hebrew locale)
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(
        '/he/multiplayer/room/test-room'
      );
    });
  });

  it('should cleanup listener on unmount', async () => {
    // GIVEN: Mounted component with listener
    const mockLocalRemove = jest.fn();
    mockAddListener.mockResolvedValue({ remove: mockLocalRemove });

    const { unmount } = render(<DeepLinkHandler />);

    // Wait for the promise to resolve and cleanup function to be set
    await waitFor(() => {
      expect(mockAddListener).toHaveBeenCalled();
    });

    // Small delay to ensure cleanup function is set
    await new Promise(resolve => setTimeout(resolve, 10));

    // WHEN: Component unmounts
    unmount();

    // THEN: Should cleanup appUrlOpen listener
    await waitFor(() => {
      expect(mockLocalRemove).toHaveBeenCalled();
    });
  });

  describe('Browser close on OAuth callback', () => {
    it('should close the in-app browser when receiving OAuth callback on native', async () => {
      // GIVEN: Native environment with OAuth callback deep link
      mockIsNative.mockReturnValue(true);
      const deepLinkUrl = 'lexiclash://auth/callback?code=test-code&locale=en';

      let appUrlOpenCallback: ((event: { url: string }) => Promise<void>) | null = null;
      mockAddListener.mockImplementation((event: string, callback: (event: { url: string }) => Promise<void>) => {
        if (event === 'appUrlOpen') {
          appUrlOpenCallback = callback;
        }
        return Promise.resolve({ remove: mockRemove });
      });

      render(<DeepLinkHandler />);

      // WHEN: Deep link event is fired with OAuth callback URL
      if (appUrlOpenCallback) {
        await appUrlOpenCallback({ url: deepLinkUrl });
      }

      // THEN: Should call Browser.close to dismiss the in-app browser
      await waitFor(() => {
        expect(Browser.close).toHaveBeenCalled();
      });
    });

    it('should NOT close browser for non-auth deep links', async () => {
      // GIVEN: Non-auth deep link
      mockIsNative.mockReturnValue(true);
      const deepLinkUrl = 'lexiclash://multiplayer/room/test-room';

      let appUrlOpenCallback: ((event: { url: string }) => Promise<void>) | null = null;
      mockAddListener.mockImplementation((event: string, callback: (event: { url: string }) => Promise<void>) => {
        if (event === 'appUrlOpen') {
          appUrlOpenCallback = callback;
        }
        return Promise.resolve({ remove: mockRemove });
      });

      render(<DeepLinkHandler />);

      // WHEN: Deep link event is fired with non-auth URL
      if (appUrlOpenCallback) {
        await appUrlOpenCallback({ url: deepLinkUrl });
      }

      // THEN: Should NOT call Browser.close
      expect(Browser.close).not.toHaveBeenCalled();
    });

    it('should NOT close browser on non-native platforms', async () => {
      // GIVEN: Non-native environment (web)
      mockIsNative.mockReturnValue(false);
      const deepLinkUrl = 'lexiclash://auth/callback?code=test-code&locale=en';

      let appUrlOpenCallback: ((event: { url: string }) => Promise<void>) | null = null;
      mockAddListener.mockImplementation((event: string, callback: (event: { url: string }) => Promise<void>) => {
        if (event === 'appUrlOpen') {
          appUrlOpenCallback = callback;
        }
        return Promise.resolve({ remove: mockRemove });
      });

      render(<DeepLinkHandler />);

      // WHEN: Deep link event is fired
      if (appUrlOpenCallback) {
        await appUrlOpenCallback({ url: deepLinkUrl });
      }

      // THEN: Should NOT call Browser.close (not native)
      expect(Browser.close).not.toHaveBeenCalled();
    });

    it('should handle Browser.close error gracefully', async () => {
      // GIVEN: Browser.close throws (e.g., browser already closed)
      mockIsNative.mockReturnValue(true);
      (Browser.close as jest.Mock).mockRejectedValue(new Error('Browser already closed'));
      const deepLinkUrl = 'lexiclash://auth/callback?code=test-code&locale=en';

      let appUrlOpenCallback: ((event: { url: string }) => Promise<void>) | null = null;
      mockAddListener.mockImplementation((event: string, callback: (event: { url: string }) => Promise<void>) => {
        if (event === 'appUrlOpen') {
          appUrlOpenCallback = callback;
        }
        return Promise.resolve({ remove: mockRemove });
      });

      render(<DeepLinkHandler />);

      // WHEN: Deep link event is fired
      if (appUrlOpenCallback) {
        await appUrlOpenCallback({ url: deepLinkUrl });
      }

      // THEN: Should still redirect despite Browser.close error
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith(
          '/en/auth/callback?code=test-code'
        );
      });
    });
  });

  describe('HTTPS App Links (Android)', () => {
    it('should handle HTTPS App Link for OAuth callback', async () => {
      // GIVEN: HTTPS App Link from Android (used instead of custom scheme)
      mockIsNative.mockReturnValue(true);
      const httpsAppLink = 'https://www.lexiclash.live/auth/callback?code=test-code-123&locale=en&from_app=true';

      let appUrlOpenCallback: ((event: { url: string }) => Promise<void>) | null = null;
      mockAddListener.mockImplementation((event: string, callback: (event: { url: string }) => Promise<void>) => {
        if (event === 'appUrlOpen') {
          appUrlOpenCallback = callback;
        }
        return Promise.resolve({ remove: mockRemove });
      });

      render(<DeepLinkHandler />);

      // WHEN: HTTPS App Link is received
      if (appUrlOpenCallback) {
        await appUrlOpenCallback({ url: httpsAppLink });
      }

      // THEN: Should extract path correctly and redirect (stripping from_app param)
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith(
          '/en/auth/callback?code=test-code-123'
        );
      });
    });

    it('should close browser for HTTPS App Link OAuth callback', async () => {
      // GIVEN: HTTPS App Link for auth callback
      mockIsNative.mockReturnValue(true);
      const httpsAppLink = 'https://www.lexiclash.live/auth/callback?code=test-code&locale=sv';

      let appUrlOpenCallback: ((event: { url: string }) => Promise<void>) | null = null;
      mockAddListener.mockImplementation((event: string, callback: (event: { url: string }) => Promise<void>) => {
        if (event === 'appUrlOpen') {
          appUrlOpenCallback = callback;
        }
        return Promise.resolve({ remove: mockRemove });
      });

      render(<DeepLinkHandler />);

      // WHEN: HTTPS App Link is received
      if (appUrlOpenCallback) {
        await appUrlOpenCallback({ url: httpsAppLink });
      }

      // THEN: Should close the browser
      await waitFor(() => {
        expect(Browser.close).toHaveBeenCalled();
      });
    });

    it('should handle HTTPS App Link without locale', async () => {
      // GIVEN: HTTPS App Link without locale parameter
      mockIsNative.mockReturnValue(true);
      const httpsAppLink = 'https://www.lexiclash.live/auth/callback?code=test-code';

      let appUrlOpenCallback: ((event: { url: string }) => Promise<void>) | null = null;
      mockAddListener.mockImplementation((event: string, callback: (event: { url: string }) => Promise<void>) => {
        if (event === 'appUrlOpen') {
          appUrlOpenCallback = callback;
        }
        return Promise.resolve({ remove: mockRemove });
      });

      render(<DeepLinkHandler />);

      // WHEN: HTTPS App Link is received
      if (appUrlOpenCallback) {
        await appUrlOpenCallback({ url: httpsAppLink });
      }

      // THEN: Should default to Hebrew locale
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith(
          '/he/auth/callback?code=test-code'
        );
      });
    });
  });
});
