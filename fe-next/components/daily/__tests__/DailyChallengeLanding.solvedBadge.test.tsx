/**
 * Tests for DailyChallengeLanding solved badge visibility
 *
 * Features tested:
 * 1. Won/lost badge on card icon with neo-brutalist styling
 * 2. Badge contains appropriate icon (Check/X)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DailyChallengeLanding } from '../DailyChallengeLanding';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock the hooks and utilities
jest.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedToday: jest.fn(() => false),
  getWordHuntStatusToday: jest.fn(() => null), // null = not played yet
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

// Mock framer-motion to render elements without animation
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

describe('DailyChallengeLanding Solved Badge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock responses
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
          json: () => Promise.resolve({ data: { played: true } }),
        });
      }
      if (url.includes('/api/buzz/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { imageUrl: 'https://example.com/image.jpg', trendingSummary: 'Test' },
          }),
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

  test('won badge should have data-testid for easy selection', async () => {
    const storage = require('@/utils/dailyChallenge/storage');
    storage.getWordHuntStatusToday.mockReturnValue({ solved: true }); // Won state

    const mockProps = {
      onSelectWordHunt: jest.fn(),
      onSelectBuzz: jest.fn(),
      currentLanguage: 'en' as const,
    };

    renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    // Wait for component to update status
    await waitFor(() => {
      const wonBadge = screen.getByTestId('won-badge');
      expect(wonBadge).toBeInTheDocument();
    }, { timeout: 2000 });

    storage.getWordHuntStatusToday.mockReturnValue(null);
  });

  test('won badge should contain Check icon', async () => {
    const storage = require('@/utils/dailyChallenge/storage');
    storage.getWordHuntStatusToday.mockReturnValue({ solved: true }); // Won state

    const mockProps = {
      onSelectWordHunt: jest.fn(),
      onSelectBuzz: jest.fn(),
      currentLanguage: 'en' as const,
    };

    renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    await waitFor(() => {
      const wonBadge = screen.getByTestId('won-badge');
      // Check icon is an SVG element inside the badge
      const svgIcon = wonBadge.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
    }, { timeout: 2000 });

    storage.getWordHuntStatusToday.mockReturnValue(null);
  });

  test('won badge should have neo-brutalist styling (solid background, border)', async () => {
    const storage = require('@/utils/dailyChallenge/storage');
    storage.getWordHuntStatusToday.mockReturnValue({ solved: true }); // Won state

    const mockProps = {
      onSelectWordHunt: jest.fn(),
      onSelectBuzz: jest.fn(),
      currentLanguage: 'en' as const,
    };

    renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    await waitFor(() => {
      const wonBadge = screen.getByTestId('won-badge');
      // Should have solid background (bg-neo-lime), not transparent
      expect(wonBadge).toHaveClass('bg-neo-lime');
      // Should have border (border-2)
      expect(wonBadge).toHaveClass('border-2');
      // Should have hard shadow
      expect(wonBadge).toHaveClass('shadow-hard-xs');
    }, { timeout: 2000 });

    storage.getWordHuntStatusToday.mockReturnValue(null);
  });

  test('lost badge should show X icon and pink background', async () => {
    const storage = require('@/utils/dailyChallenge/storage');
    storage.getWordHuntStatusToday.mockReturnValue({ solved: false }); // Lost state

    const mockProps = {
      onSelectWordHunt: jest.fn(),
      onSelectBuzz: jest.fn(),
      currentLanguage: 'en' as const,
    };

    renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    await waitFor(() => {
      const lostBadge = screen.getByTestId('lost-badge');
      expect(lostBadge).toBeInTheDocument();
      // Should have pink background for loss
      expect(lostBadge).toHaveClass('bg-neo-pink');
      // Should have X icon
      const svgIcon = lostBadge.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
    }, { timeout: 2000 });

    storage.getWordHuntStatusToday.mockReturnValue(null);
  });
});
