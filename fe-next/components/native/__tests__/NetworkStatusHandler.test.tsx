/**
 * Tests for NetworkStatusHandler component
 *
 * Tests offline fallback rendering in native environment.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NetworkStatusHandler } from '../NetworkStatusHandler';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { isNative } from '@/utils/platform';

// Mock dependencies
vi.mock('@/hooks/useOnlineStatus');
vi.mock('@/utils/platform');
vi.mock('../OfflineFallback', () => ({
  OfflineFallback: ({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) => (
    <div data-testid="offline-fallback">
      <button onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? 'Retrying' : 'Retry'}
      </button>
    </div>
  ),
}));

const mockUseOnlineStatus = useOnlineStatus as jest.MockedFunction<typeof useOnlineStatus>;
const mockIsNative = isNative as jest.MockedFunction<typeof isNative>;

describe('NetworkStatusHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.location.reload mock
    delete (window as any).location;
    window.location = { reload: vi.fn() } as any;
  });

  describe('online scenarios', () => {
    it('should render children when online and native', () => {
      // GIVEN
      mockUseOnlineStatus.mockReturnValue(true);
      mockIsNative.mockReturnValue(true);

      // WHEN
      render(
        <NetworkStatusHandler>
          <div data-testid="content">App Content</div>
        </NetworkStatusHandler>
      );

      // THEN
      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.queryByTestId('offline-fallback')).not.toBeInTheDocument();
    });

    it('should render children when online and web', () => {
      // GIVEN
      mockUseOnlineStatus.mockReturnValue(true);
      mockIsNative.mockReturnValue(false);

      // WHEN
      render(
        <NetworkStatusHandler>
          <div data-testid="content">App Content</div>
        </NetworkStatusHandler>
      );

      // THEN
      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.queryByTestId('offline-fallback')).not.toBeInTheDocument();
    });
  });

  describe('offline scenarios', () => {
    it('should render OfflineFallback when offline and native', () => {
      // GIVEN
      mockUseOnlineStatus.mockReturnValue(false);
      mockIsNative.mockReturnValue(true);

      // WHEN
      render(
        <NetworkStatusHandler>
          <div data-testid="content">App Content</div>
        </NetworkStatusHandler>
      );

      // THEN
      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
      expect(screen.getByTestId('offline-fallback')).toBeInTheDocument();
    });

    it('should render children when offline and web (browser handles offline)', () => {
      // GIVEN
      mockUseOnlineStatus.mockReturnValue(false);
      mockIsNative.mockReturnValue(false);

      // WHEN
      render(
        <NetworkStatusHandler>
          <div data-testid="content">App Content</div>
        </NetworkStatusHandler>
      );

      // THEN - Web browsers have their own offline indicators
      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.queryByTestId('offline-fallback')).not.toBeInTheDocument();
    });
  });

  describe('retry functionality', () => {
    it('should reload page when retry button clicked', () => {
      // GIVEN
      mockUseOnlineStatus.mockReturnValue(false);
      mockIsNative.mockReturnValue(true);

      render(
        <NetworkStatusHandler>
          <div data-testid="content">App Content</div>
        </NetworkStatusHandler>
      );

      // WHEN
      const retryButton = screen.getByRole('button', { name: 'Retry' });
      fireEvent.click(retryButton);

      // THEN
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should set isRetrying state when retry clicked', () => {
      // GIVEN
      mockUseOnlineStatus.mockReturnValue(false);
      mockIsNative.mockReturnValue(true);

      render(
        <NetworkStatusHandler>
          <div data-testid="content">App Content</div>
        </NetworkStatusHandler>
      );

      // WHEN
      const retryButton = screen.getByRole('button', { name: 'Retry' });
      fireEvent.click(retryButton);

      // THEN - Button should show "Retrying" text
      expect(screen.getByRole('button', { name: 'Retrying' })).toBeDisabled();
    });
  });

  describe('props', () => {
    it('should pass children through when online', () => {
      // GIVEN
      mockUseOnlineStatus.mockReturnValue(true);
      mockIsNative.mockReturnValue(false);

      // WHEN
      render(
        <NetworkStatusHandler>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </NetworkStatusHandler>
      );

      // THEN
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });
});
