/**
 * Tests for DailyChallengeLanding solved badge visibility and Word Hunt animation
 *
 * Features tested:
 * 1. Enhanced solved badge with glow effect and Check icon
 * 2. Word Hunt mini grid SVG line renders behind letters
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DailyChallengeLanding } from '../DailyChallengeLanding';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock the hooks and utilities
jest.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedToday: jest.fn(() => false),
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
      <path d={d} stroke={stroke} strokeWidth={strokeWidth} {...props} data-testid="swipe-line" />
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
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  test('solved badge should have data-testid for easy selection', async () => {
    const storage = require('@/utils/dailyChallenge/storage');
    storage.hasPlayedToday.mockReturnValue(true);

    const mockProps = {
      onSelectWordHunt: jest.fn(),
      onSelectBuzz: jest.fn(),
      currentLanguage: 'en' as const,
    };

    renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    // Wait for component to update status
    await waitFor(() => {
      const solvedBadge = screen.getByTestId('solved-badge');
      expect(solvedBadge).toBeInTheDocument();
    }, { timeout: 2000 });

    storage.hasPlayedToday.mockReturnValue(false);
  });

  test('solved badge should contain Check icon', async () => {
    const storage = require('@/utils/dailyChallenge/storage');
    storage.hasPlayedToday.mockReturnValue(true);

    const mockProps = {
      onSelectWordHunt: jest.fn(),
      onSelectBuzz: jest.fn(),
      currentLanguage: 'en' as const,
    };

    const { container } = renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    await waitFor(() => {
      const solvedBadge = screen.getByTestId('solved-badge');
      // Check icon is an SVG element inside the badge
      const svgIcon = solvedBadge.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
    }, { timeout: 2000 });

    storage.hasPlayedToday.mockReturnValue(false);
  });

  test('solved badge should have neo-brutalist styling (solid background, border)', async () => {
    const storage = require('@/utils/dailyChallenge/storage');
    storage.hasPlayedToday.mockReturnValue(true);

    const mockProps = {
      onSelectWordHunt: jest.fn(),
      onSelectBuzz: jest.fn(),
      currentLanguage: 'en' as const,
    };

    renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    await waitFor(() => {
      const solvedBadge = screen.getByTestId('solved-badge');
      // Should have solid background (bg-neo-lime), not transparent
      expect(solvedBadge).toHaveClass('bg-neo-lime');
      // Should have border (border-2)
      expect(solvedBadge).toHaveClass('border-2');
      // Should have hard shadow
      expect(solvedBadge).toHaveClass('shadow-hard-sm');
    }, { timeout: 2000 });

    storage.hasPlayedToday.mockReturnValue(false);
  });

  test('solved badge should show translated text on larger screens', async () => {
    const storage = require('@/utils/dailyChallenge/storage');
    storage.hasPlayedToday.mockReturnValue(true);

    const mockProps = {
      onSelectWordHunt: jest.fn(),
      onSelectBuzz: jest.fn(),
      currentLanguage: 'en' as const,
    };

    renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    await waitFor(() => {
      const solvedBadge = screen.getByTestId('solved-badge');
      // Should contain "Solved" text (hidden on mobile via hidden xs:inline)
      expect(solvedBadge).toHaveTextContent('Solved');
    }, { timeout: 2000 });

    storage.hasPlayedToday.mockReturnValue(false);
  });
});

describe('WordHuntMiniGrid SVG Animation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  test('grid container should have z-10 to render above SVG line', () => {
    const mockProps = {
      onSelectWordHunt: jest.fn(),
      onSelectBuzz: jest.fn(),
      currentLanguage: 'en' as const,
    };

    const { container } = renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    // Find the grid container (has grid-cols-3)
    const gridContainer = container.querySelector('.grid-cols-3');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveClass('z-10');
  });

  test('corner accents should have z-20 to render above grid', () => {
    const mockProps = {
      onSelectWordHunt: jest.fn(),
      onSelectBuzz: jest.fn(),
      currentLanguage: 'en' as const,
    };

    const { container } = renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    // Find corner accent elements (bg-neo-orange at top-start, bg-neo-yellow at bottom-end)
    const topCorner = container.querySelector('.bg-neo-orange.z-20');
    const bottomCorner = container.querySelector('.bg-neo-yellow.z-20');

    expect(topCorner).toBeInTheDocument();
    expect(bottomCorner).toBeInTheDocument();
  });

  test('letters should be visible in the mini grid', () => {
    const mockProps = {
      onSelectWordHunt: jest.fn(),
      onSelectBuzz: jest.fn(),
      currentLanguage: 'en' as const,
    };

    renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    // Check that English letters are present (W-O-R-D-H-U-N-T-!)
    expect(screen.getByText('W')).toBeInTheDocument();
    expect(screen.getByText('O')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  test('SVG line should appear on hover with z-0', () => {
    const mockProps = {
      onSelectWordHunt: jest.fn(),
      onSelectBuzz: jest.fn(),
      currentLanguage: 'en' as const,
    };

    const { container } = renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    // Find the Word Hunt card (has the grid)
    const wordHuntCard = container.querySelector('[role="button"]');
    expect(wordHuntCard).toBeInTheDocument();

    // Trigger hover
    fireEvent.mouseEnter(wordHuntCard!);

    // After hover, SVG should appear with z-0 class
    const svg = container.querySelector('svg.z-0');
    expect(svg).toBeInTheDocument();

    // The SVG path should have our test id
    const swipeLine = screen.getByTestId('swipe-line');
    expect(swipeLine).toBeInTheDocument();
  });

  test('SVG line should have proper path for 4 letters', () => {
    const mockProps = {
      onSelectWordHunt: jest.fn(),
      onSelectBuzz: jest.fn(),
      currentLanguage: 'en' as const,
    };

    const { container } = renderWithProviders(<DailyChallengeLanding {...mockProps} />);

    // Trigger hover
    const wordHuntCard = container.querySelector('[role="button"]');
    fireEvent.mouseEnter(wordHuntCard!);

    // Check the path connects 4 points: M 17,17 L 50,17 L 83,17 L 83,50
    const swipeLine = screen.getByTestId('swipe-line');
    expect(swipeLine).toHaveAttribute('d', 'M 17,17 L 50,17 L 83,17 L 83,50');
  });
});
