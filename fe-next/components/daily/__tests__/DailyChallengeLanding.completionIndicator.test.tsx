/**
 * Tests for completion indicator on Daily Challenge cards
 *
 * Requirements:
 * 1. When a challenge is completed, show a won/lost badge on the card icon
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

describe('DailyChallengeLanding Completion Indicator', () => {
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
      if (url.includes('daily-streak')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ streak: 0 }),
        });
      }
      if (url.includes('daily-challenge/leaderboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  describe('Completion badge on card icon', () => {
    test('completed Word Hunt card should show won badge', async () => {
      const storage = require('@/utils/dailyChallenge/storage');
      storage.getWordHuntStatusToday.mockReturnValue({ solved: true });

      const mockProps = {
        onSelectWordHunt: jest.fn(),
        onSelectBuzz: jest.fn(),
        currentLanguage: 'en' as const,
      };

      renderWithProviders(<DailyChallengeLanding {...mockProps} />);

      await waitFor(() => {
        const wonBadge = screen.getByTestId('won-badge');
        expect(wonBadge).toBeInTheDocument();
      }, { timeout: 2000 });

      storage.getWordHuntStatusToday.mockReturnValue(null);
    });

    test('lost Word Hunt card should show lost badge with pink styling', async () => {
      const storage = require('@/utils/dailyChallenge/storage');
      storage.getWordHuntStatusToday.mockReturnValue({ solved: false });

      const mockProps = {
        onSelectWordHunt: jest.fn(),
        onSelectBuzz: jest.fn(),
        currentLanguage: 'en' as const,
      };

      renderWithProviders(<DailyChallengeLanding {...mockProps} />);

      await waitFor(() => {
        const lostBadge = screen.getByTestId('lost-badge');
        expect(lostBadge).toBeInTheDocument();
        expect(lostBadge.className).toContain('bg-neo-pink');
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

      // Wait for initial render - no won badge yet
      await waitFor(() => {
        expect(screen.queryByTestId('won-badge')).not.toBeInTheDocument();
      });

      // Simulate user completing challenge and coming back
      storage.getWordHuntStatusToday.mockReturnValue({ solved: true });

      // Simulate visibility change (user returns to tab)
      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Status should now be refreshed
      await waitFor(() => {
        const wonBadge = screen.getByTestId('won-badge');
        expect(wonBadge).toBeInTheDocument();
      }, { timeout: 2000 });

      storage.getWordHuntStatusToday.mockReturnValue(null);
    });
  });

  describe('Visual hierarchy', () => {
    test('completed card should have reduced opacity', async () => {
      const storage = require('@/utils/dailyChallenge/storage');
      storage.getWordHuntStatusToday.mockReturnValue({ solved: true });

      const mockProps = {
        onSelectWordHunt: jest.fn(),
        onSelectBuzz: jest.fn(),
        currentLanguage: 'en' as const,
      };

      renderWithProviders(<DailyChallengeLanding {...mockProps} />);

      await waitFor(() => {
        const wordHuntCard = screen.getByTestId('quest-card-wordHunt');
        const cardInner = wordHuntCard.querySelector('[role="button"]');
        expect(cardInner?.className).toContain('opacity-85');
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
        expect(screen.getByText(/view results/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      storage.getWordHuntStatusToday.mockReturnValue(null);
    });
  });
});
