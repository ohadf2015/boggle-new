/**
 * Tests for enhanced completion indicator on Daily Challenge cards
 *
 * Requirements:
 * 1. When a challenge is completed, show a prominent overlay/banner - not just a small checkmark
 * 2. Status should refresh when page becomes visible (user returns from challenge)
 * 3. Clear visual distinction between "not played" and "completed" states
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { DailyChallengeLanding } from '../DailyChallengeLanding';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock the hooks and utilities
jest.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedToday: jest.fn(() => false),
  getWordHuntStatusToday: jest.fn(() => null),
}));

jest.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: jest.fn(() => 'test-fingerprint'),
}));

jest.mock('@/utils/dailyChallenge', () => ({
  getSecondsUntilNextDaily: jest.fn(() => 3600),
  formatCountdown: jest.fn(() => '01:00:00'),
}));

jest.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: jest.fn(),
      onMouseLeave: jest.fn(),
      onMouseMove: jest.fn(),
      onTouchStart: jest.fn(),
      onTouchMove: jest.fn(),
      onTouchEnd: jest.fn(),
    },
  }),
}));

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  motion: {
    div: ({ children, className, style, animate, initial, ...props }: React.ComponentProps<'div'> & { animate?: unknown; initial?: unknown }) => (
      <div className={className} style={style} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: React.ComponentProps<'span'>) => (
      <span className={className} {...props}>{children}</span>
    ),
    button: ({ children, ...props }: React.ComponentProps<'button'>) => (
      <button {...props}>{children}</button>
    ),
    path: ({ d, stroke, strokeWidth, ...props }: React.SVGProps<SVGPathElement>) => (
      <path d={d} stroke={stroke} strokeWidth={strokeWidth} {...props} />
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AuthProvider>
      <LanguageProvider initialLanguage="en">
        {ui}
      </LanguageProvider>
    </AuthProvider>
  );
}

describe('DailyChallengeLanding Enhanced Completion Indicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock responses for API calls
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('check-availability')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ available: true }),
        });
      }
      if (url.includes('check-played')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { played: false } }),
        });
      }
      if (url.includes('/api/buzz/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: false }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  describe('Prominent completion overlay', () => {
    test('completed Word Hunt card should show completion overlay banner', async () => {
      const storage = require('@/utils/dailyChallenge/storage');
      storage.getWordHuntStatusToday.mockReturnValue({ solved: true });

      const mockProps = {
        onSelectWordHunt: jest.fn(),
        onSelectBuzz: jest.fn(),
        currentLanguage: 'en' as const,
      };

      renderWithProviders(<DailyChallengeLanding {...mockProps} />);

      await waitFor(() => {
        // Should have a prominent completion overlay element
        const completionOverlay = screen.getByTestId('completion-overlay-wordHunt');
        expect(completionOverlay).toBeInTheDocument();
      }, { timeout: 2000 });

      storage.getWordHuntStatusToday.mockReturnValue(null);
    });

    test('completion overlay should contain clear "COMPLETED" message', async () => {
      const storage = require('@/utils/dailyChallenge/storage');
      storage.getWordHuntStatusToday.mockReturnValue({ solved: true });

      const mockProps = {
        onSelectWordHunt: jest.fn(),
        onSelectBuzz: jest.fn(),
        currentLanguage: 'en' as const,
      };

      renderWithProviders(<DailyChallengeLanding {...mockProps} />);

      await waitFor(() => {
        // Should display "Complete!" text prominently
        expect(screen.getByText(/complete!/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      storage.getWordHuntStatusToday.mockReturnValue(null);
    });

    test('completion overlay should have trophy icon for won state', async () => {
      const storage = require('@/utils/dailyChallenge/storage');
      storage.getWordHuntStatusToday.mockReturnValue({ solved: true });

      const mockProps = {
        onSelectWordHunt: jest.fn(),
        onSelectBuzz: jest.fn(),
        currentLanguage: 'en' as const,
      };

      const { container } = renderWithProviders(<DailyChallengeLanding {...mockProps} />);

      await waitFor(() => {
        const completionOverlay = screen.getByTestId('completion-overlay-wordHunt');
        // Should contain a trophy SVG icon
        const trophyIcon = completionOverlay.querySelector('svg');
        expect(trophyIcon).toBeInTheDocument();
      }, { timeout: 2000 });

      storage.getWordHuntStatusToday.mockReturnValue(null);
    });

    test('lost state should show different styling than won state', async () => {
      const storage = require('@/utils/dailyChallenge/storage');
      storage.getWordHuntStatusToday.mockReturnValue({ solved: false }); // Lost

      const mockProps = {
        onSelectWordHunt: jest.fn(),
        onSelectBuzz: jest.fn(),
        currentLanguage: 'en' as const,
      };

      renderWithProviders(<DailyChallengeLanding {...mockProps} />);

      await waitFor(() => {
        const completionOverlay = screen.getByTestId('completion-overlay-wordHunt');
        // Lost state should have different styling (pink instead of lime)
        // Class includes opacity modifier: bg-neo-pink/90
        expect(completionOverlay.className).toContain('bg-neo-pink');
      }, { timeout: 2000 });

      storage.getWordHuntStatusToday.mockReturnValue(null);
    });
  });

  describe('Status refresh on visibility change', () => {
    test('should refresh status when page becomes visible', async () => {
      const storage = require('@/utils/dailyChallenge/storage');
      // Initial state: not played
      storage.getWordHuntStatusToday.mockReturnValue(null);

      const mockProps = {
        onSelectWordHunt: jest.fn(),
        onSelectBuzz: jest.fn(),
        currentLanguage: 'en' as const,
      };

      renderWithProviders(<DailyChallengeLanding {...mockProps} />);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.queryByTestId('completion-overlay-wordHunt')).not.toBeInTheDocument();
      });

      // Simulate user completing challenge and coming back
      storage.getWordHuntStatusToday.mockReturnValue({ solved: true });

      // Simulate visibility change (user returns to tab)
      await act(async () => {
        // Create a mock visibilitychange event
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Status should now be refreshed
      await waitFor(() => {
        const completionOverlay = screen.getByTestId('completion-overlay-wordHunt');
        expect(completionOverlay).toBeInTheDocument();
      }, { timeout: 2000 });

      storage.getWordHuntStatusToday.mockReturnValue(null);
    });
  });

  describe('Visual hierarchy', () => {
    test('completion overlay should cover most of the card preview area', async () => {
      const storage = require('@/utils/dailyChallenge/storage');
      storage.getWordHuntStatusToday.mockReturnValue({ solved: true });

      const mockProps = {
        onSelectWordHunt: jest.fn(),
        onSelectBuzz: jest.fn(),
        currentLanguage: 'en' as const,
      };

      const { container } = renderWithProviders(<DailyChallengeLanding {...mockProps} />);

      await waitFor(() => {
        const completionOverlay = screen.getByTestId('completion-overlay-wordHunt');
        // Overlay should have absolute positioning to cover the card
        expect(completionOverlay).toHaveClass('absolute');
        // Should have a high z-index to be on top
        expect(completionOverlay.className).toMatch(/z-\d+/);
      }, { timeout: 2000 });

      storage.getWordHuntStatusToday.mockReturnValue(null);
    });

    test('button should say "VIEW RESULTS" when completed', async () => {
      const storage = require('@/utils/dailyChallenge/storage');
      storage.getWordHuntStatusToday.mockReturnValue({ solved: true });

      const mockProps = {
        onSelectWordHunt: jest.fn(),
        onSelectBuzz: jest.fn(),
        currentLanguage: 'en' as const,
      };

      renderWithProviders(<DailyChallengeLanding {...mockProps} />);

      await waitFor(() => {
        // The button text should change to "VIEW RESULTS"
        expect(screen.getByText(/view results/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      storage.getWordHuntStatusToday.mockReturnValue(null);
    });
  });
});
