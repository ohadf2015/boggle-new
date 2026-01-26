/**
 * Tests for NativeAppProvider component
 *
 * Tests safe area initialization and app lifecycle integration.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NativeAppProvider } from '../NativeAppProvider';
import { useSafeArea } from '@/hooks/useSafeArea';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { getSharedSocketIfExists } from '@/utils/SocketContext';

// Mock dependencies
jest.mock('@/hooks/useSafeArea');
jest.mock('@/hooks/useAppLifecycle');
jest.mock('@/utils/SocketContext');
jest.mock('@/utils/logger', () => ({
  log: jest.fn(),
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockUseSafeArea = useSafeArea as jest.MockedFunction<typeof useSafeArea>;
const mockUseAppLifecycle = useAppLifecycle as jest.MockedFunction<typeof useAppLifecycle>;
const mockGetSharedSocketIfExists = getSharedSocketIfExists as jest.MockedFunction<
  typeof getSharedSocketIfExists
>;

describe('NativeAppProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

      // THEN
      expect(mockUseAppLifecycle).toHaveBeenCalledTimes(1);
      expect(mockUseAppLifecycle).toHaveBeenCalledWith({
        onForeground: expect.any(Function),
        onBackground: expect.any(Function),
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
        connect: jest.fn(),
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
        connect: jest.fn(),
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
        disconnect: jest.fn(),
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
});
