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
import DeepLinkHandler from '@/components/DeepLinkHandler';

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

  beforeEach(() => {
    mockRouter = {
      replace: jest.fn(),
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    mockRemove = jest.fn();
    mockAddListener = App.addListener as jest.Mock;
    mockAddListener.mockClear();
    mockAddListener.mockResolvedValue({ remove: mockRemove });
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
});
