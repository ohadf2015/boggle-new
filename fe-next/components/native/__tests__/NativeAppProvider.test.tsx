/**
 * Tests for NativeAppProvider component
 *
 * Tests safe area initialization and app lifecycle integration.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { NativeAppProvider } from '../NativeAppProvider';
import { useSafeArea } from '@/hooks/useSafeArea';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { getSharedSocketIfExists } from '@/utils/SocketContext';
import { isNative } from '@/utils/platform';

// Mock dependencies
vi.mock('@/hooks/useSafeArea');
vi.mock('@/hooks/useAppLifecycle');
vi.mock('@/utils/SocketContext');
vi.mock('@/utils/platform', () => ({
  isNative: vi.fn(() => false),
}));

const mockSplashHide = vi.fn(() => Promise.resolve());
vi.mock('@capacitor/splash-screen', () => ({
  SplashScreen: {
    hide: (...args: unknown[]) => mockSplashHide(...args),
  },
}));

vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setOverlaysWebView: vi.fn(() => Promise.resolve()),
    setBackgroundColor: vi.fn(() => Promise.resolve()),
    setStyle: vi.fn(() => Promise.resolve()),
  },
  Style: { Dark: 'DARK' },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })),
  },
}));

vi.mock('@/utils/logger', () => ({
  log: vi.fn(),
  __esModule: true,
  default: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const mockUseSafeArea = useSafeArea as jest.MockedFunction<typeof useSafeArea>;
const mockUseAppLifecycle = useAppLifecycle as jest.MockedFunction<typeof useAppLifecycle>;
const mockGetSharedSocketIfExists = getSharedSocketIfExists as jest.MockedFunction<
  typeof getSharedSocketIfExists
>;
const mockIsNative = isNative as jest.MockedFunction<typeof isNative>;

describe('NativeAppProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should call useSafeArea on mount', () => {
      // GIVEN
      mockUseSafeArea.mockReturnValue({ top: 0, bottom: 0, left: 0, right: 0 });

      // WHEN
      render(
        <NativeAppProvider>
          <div>Content</div>
        </NativeAppProvider>
      );

      // THEN
      expect(mockUseSafeArea).toHaveBeenCalledTimes(1);
    });

    it('should call useAppLifecycle with callbacks', () => {
      // GIVEN
      mockUseAppLifecycle.mockImplementation(() => {});

      // WHEN
      render(
        <NativeAppProvider>
          <div>Content</div>
        </NativeAppProvider>
      );

      // THEN: two independent lifecycle consumers — the socket-reconnect wiring
      // here, plus useWebViewRepaintOnResume (repaint the WebView after a
      // fullscreen ad Activity dismisses). Matches the codebase pattern of one
      // appStateChange listener per concern (cf. BannerCoordinatorMount).
      expect(mockUseAppLifecycle).toHaveBeenCalledTimes(2);
      // The socket-reconnect consumer wires both foreground + background.
      expect(mockUseAppLifecycle).toHaveBeenCalledWith({
        onForeground: expect.any(Function),
        onBackground: expect.any(Function),
      });
      // The repaint consumer wires foreground only.
      expect(mockUseAppLifecycle).toHaveBeenCalledWith({
        onForeground: expect.any(Function),
      });
    });

    it('should render children', () => {
      // GIVEN/WHEN
      render(
        <NativeAppProvider>
          <div data-testid="child">Test Content</div>
        </NativeAppProvider>
      );

      // THEN
      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('lifecycle callbacks', () => {
    it('should reconnect socket on foreground when disconnected', () => {
      // GIVEN
      const mockSocket = {
        connected: false,
        connect: vi.fn(),
      };
      mockGetSharedSocketIfExists.mockReturnValue(mockSocket as any);

      let capturedCallbacks: any = null;
      mockUseAppLifecycle.mockImplementation((callbacks) => {
        capturedCallbacks = callbacks;
      });

      render(
        <NativeAppProvider>
          <div>Content</div>
        </NativeAppProvider>
      );

      // WHEN
      capturedCallbacks.onForeground();

      // THEN
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('should not reconnect socket on foreground when already connected', () => {
      // GIVEN
      const mockSocket = {
        connected: true,
        connect: vi.fn(),
      };
      mockGetSharedSocketIfExists.mockReturnValue(mockSocket as any);

      let capturedCallbacks: any = null;
      mockUseAppLifecycle.mockImplementation((callbacks) => {
        capturedCallbacks = callbacks;
      });

      render(
        <NativeAppProvider>
          <div>Content</div>
        </NativeAppProvider>
      );

      // WHEN
      capturedCallbacks.onForeground();

      // THEN
      expect(mockSocket.connect).not.toHaveBeenCalled();
    });

    it('should handle foreground when socket does not exist', () => {
      // GIVEN
      mockGetSharedSocketIfExists.mockReturnValue(null);

      let capturedCallbacks: any = null;
      mockUseAppLifecycle.mockImplementation((callbacks) => {
        capturedCallbacks = callbacks;
      });

      render(
        <NativeAppProvider>
          <div>Content</div>
        </NativeAppProvider>
      );

      // WHEN/THEN - Should not throw
      expect(() => capturedCallbacks.onForeground()).not.toThrow();
    });

    it('should call onBackground callback', () => {
      // GIVEN
      let capturedCallbacks: any = null;
      mockUseAppLifecycle.mockImplementation((callbacks) => {
        capturedCallbacks = callbacks;
      });

      render(
        <NativeAppProvider>
          <div>Content</div>
        </NativeAppProvider>
      );

      // WHEN/THEN - Should not throw
      expect(() => capturedCallbacks.onBackground()).not.toThrow();
    });

    it('should not disconnect socket on background', () => {
      // GIVEN
      const mockSocket = {
        connected: true,
        disconnect: vi.fn(),
      };
      mockGetSharedSocketIfExists.mockReturnValue(mockSocket as any);

      let capturedCallbacks: any = null;
      mockUseAppLifecycle.mockImplementation((callbacks) => {
        capturedCallbacks = callbacks;
      });

      render(
        <NativeAppProvider>
          <div>Content</div>
        </NativeAppProvider>
      );

      // WHEN
      capturedCallbacks.onBackground();

      // THEN - We don't disconnect on background
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('multiple children', () => {
    it('should render multiple children', () => {
      // GIVEN/WHEN
      render(
        <NativeAppProvider>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </NativeAppProvider>
      );

      // THEN
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });

  describe('splash screen', () => {
    it('hides the Capacitor splash screen once the app has mounted on native', async () => {
      // Regression: splash auto-hides at 2s regardless of WebView readiness,
      // leaving users staring at a black WebView on slow networks. Hiding
      // explicitly from the client guarantees the splash only goes away once
      // React has painted the first screen.
      // GIVEN
      mockIsNative.mockReturnValue(true);

      // WHEN
      render(
        <NativeAppProvider>
          <div>Content</div>
        </NativeAppProvider>
      );

      // THEN
      await waitFor(() => expect(mockSplashHide).toHaveBeenCalled());
    });

    it('does not call SplashScreen.hide on web', async () => {
      // GIVEN
      mockIsNative.mockReturnValue(false);

      // WHEN
      render(
        <NativeAppProvider>
          <div>Content</div>
        </NativeAppProvider>
      );

      // THEN - allow any pending microtasks to flush before asserting
      await Promise.resolve();
      expect(mockSplashHide).not.toHaveBeenCalled();
    });
  });
});
