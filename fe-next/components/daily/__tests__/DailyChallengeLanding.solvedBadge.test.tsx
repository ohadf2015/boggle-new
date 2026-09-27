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
import * as storage from '@/utils/dailyChallenge/storage';

// Mock the hooks and utilities
vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedToday: vi.fn(() => false),
  getWordHuntStatusToday: vi.fn(() => null), // null = not played yet
  hasPlayedWordWheelToday: vi.fn(() => false),
}));

const mockUseDailyChallengeStatus = vi.fn(() => ({
  hasPlayed: false,
  hasSolved: false,
  loading: false,
  streak: 0,
  refresh: vi.fn(),
}));

vi.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: () => mockUseDailyChallengeStatus(),
}));

vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: vi.fn(() => 'test-fingerprint'),
}));

vi.mock('@/utils/dailyChallenge', () => ({
  getSecondsUntilNextDaily: vi.fn(() => 3600),
  formatCountdown: vi.fn(() => '01:00:00'),
}));

vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: vi.fn(),
      onMouseLeave: vi.fn(),
      onMouseMove: vi.fn(),
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn(),
    },
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

// Mock framer-motion to render elements without animation
vi.mock('framer-motion', () => ({
  ...vi.importActual('framer-motion'),
  m: {
    a: ({ children, className, style, ...props }: React.ComponentProps<'a'> & { animate?: unknown; initial?: unknown; transition?: unknown; whileHover?: unknown; whileTap?: unknown }) => (
      <a className={className} style={style} {...props}>{children}</a>
    ),
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
  useReducedMotion: () => false,
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
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
    vi.clearAllMocks();
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

  test('won badge should have data-testid for easy selection when Word Hunt is primary', async () => {
    // Set up: Word Hunt is won, Word Wheel is unplayed
    // With this setup, pickPrimaryMode will select Word Wheel (first unplayed)
    // So Word Hunt badge will appear as a secondary mode (CompactModeRow) with orange-done-badge
    mockUseDailyChallengeStatus.mockReturnValue({
      hasPlayed: true,
      hasSolved: true,  // Won state
      loading: false,
      streak: 0,
      refresh: vi.fn(),
    });

    const mockProps = {
      onSelectWordHunt: vi.fn(),
      onSelectWordWheel: vi.fn(),
      currentLanguage: 'en' as const,
    };

    renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    // When Word Hunt is won and Word Wheel is unplayed, Word Wheel becomes primary
    // and Word Hunt appears as a secondary CompactModeRow with orange-done-badge
    await waitFor(() => {
      const doneBadge = screen.getByTestId('orange-done-badge');
      expect(doneBadge).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('won badge should contain Check icon (rendered as CompactModeRow when secondary)', async () => {
    mockUseDailyChallengeStatus.mockReturnValue({
      hasPlayed: true,
      hasSolved: true,  // Won state
      loading: false,
      streak: 0,
      refresh: vi.fn(),
    });

    const mockProps = {
      onSelectWordHunt: vi.fn(),
      onSelectWordWheel: vi.fn(),
      currentLanguage: 'en' as const,
    };

    renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    await waitFor(() => {
      // When Word Hunt is won and secondary, it renders as CompactModeRow with orange-done-badge
      const doneBadge = screen.getByTestId('orange-done-badge');
      // Check icon is an SVG element inside the badge
      const svgIcon = doneBadge.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('won badge should have neo-brutalist styling when rendered as CompactModeRow', async () => {
    mockUseDailyChallengeStatus.mockReturnValue({
      hasPlayed: true,
      hasSolved: true,  // Won state
      loading: false,
      streak: 0,
      refresh: vi.fn(),
    });

    const mockProps = {
      onSelectWordHunt: vi.fn(),
      onSelectWordWheel: vi.fn(),
      currentLanguage: 'en' as const,
    };

    renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    await waitFor(() => {
      // CompactModeRow done-badge styles
      const doneBadge = screen.getByTestId('orange-done-badge');
      // Should have solid background (bg-neo-lime)
      expect(doneBadge).toHaveClass('bg-neo-lime');
      // Should have border
      expect(doneBadge).toHaveClass('border');
      // Should have hard shadow
      expect(doneBadge).toHaveClass('shadow-hard-xs');
    }, { timeout: 2000 });
  });

  test('lost badge should show X icon and pink background when Word Hunt is primary', async () => {
    // Set up: Word Hunt is lost (played but not solved)
    // With this setup, pickPrimaryMode will select Word Hunt (new or lost)
    // So lost badge will appear on the primary QuestCard
    mockUseDailyChallengeStatus.mockReturnValue({
      hasPlayed: true,
      hasSolved: false,  // Lost state
      loading: false,
      streak: 0,
      refresh: vi.fn(),
    });

    const mockProps = {
      onSelectWordHunt: vi.fn(),
      onSelectWordWheel: vi.fn(),
      currentLanguage: 'en' as const,
    };

    renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    await waitFor(() => {
      // When Word Hunt is lost, it becomes the primary mode with lost-badge on QuestCard
      const lostBadge = screen.getByTestId('lost-badge');
      expect(lostBadge).toBeInTheDocument();
      // Should have pink background for loss
      expect(lostBadge).toHaveClass('bg-neo-pink');
      // Should have X icon
      const svgIcon = lostBadge.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
