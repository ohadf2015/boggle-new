/**
 * Test: Profile Navigation UX - Prevent Tab Switching Confusion
 *
 * BUG: When user clicks Profile tab in GlobalBottomNav from landing page,
 * the tabs suddenly change to different content (Overview, Stats, Achievements, Collection).
 * This creates cognitive dissonance - tabs should remain consistent.
 *
 * EXPECTED: GlobalBottomNav should remain visible and active on profile pages.
 * Profile sections should be navigated via swipe gestures or internal UI controls,
 * not by replacing the main navigation tabs.
 */

import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import GlobalBottomNav from '@/components/GlobalBottomNav';
import React from 'react';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

// Mock contexts
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

jest.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => ({
    isInGame: false,
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
  }),
}));

jest.mock('@/hooks/useSafeArea', () => ({
  useSafeArea: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

jest.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
  }),
}));

describe('Profile Navigation UX - Tab Consistency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should remain visible on /profile path (fixed behavior)', () => {
    // GIVEN user is on profile page
    (usePathname as jest.Mock).mockReturnValue('/en/profile');

    // WHEN GlobalBottomNav is rendered
    render(<GlobalBottomNav />);

    // THEN it should remain visible to maintain consistent navigation
    expect(screen.getByLabelText(/home/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/play/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/profile/i)).toBeInTheDocument();
  });

  it('should remain visible on landing page (existing behavior)', () => {
    // GIVEN user is on landing page
    (usePathname as jest.Mock).mockReturnValue('/en');

    // WHEN GlobalBottomNav is rendered
    render(<GlobalBottomNav />);

    // THEN all three main tabs should be visible
    expect(screen.getByLabelText(/home/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/play/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/profile/i)).toBeInTheDocument();
  });

  it('should show Profile tab as active when on /profile path', () => {
    // This test will only pass after the fix is implemented
    // Currently it will fail because GlobalBottomNav is hidden on /profile

    // GIVEN user is on profile page
    (usePathname as jest.Mock).mockReturnValue('/en/profile');

    // WHEN GlobalBottomNav is rendered
    render(<GlobalBottomNav />);

    // THEN Profile tab should be visible and marked as active
    const profileTab = screen.getByLabelText(/profile/i);
    expect(profileTab).toBeInTheDocument();
    expect(profileTab).toHaveAttribute('aria-current', 'page');
  });

  describe('UX Requirements', () => {
    it('should maintain consistent navigation across all main sections', () => {
      // Test that GlobalBottomNav appears on all main sections
      const paths = [
        '/en',           // Landing
        '/en/leaderboard', // Leaderboard
        '/en/profile',   // Profile (currently hidden, needs fix)
      ];

      paths.forEach(path => {
        (usePathname as jest.Mock).mockReturnValue(path);
        const { unmount } = render(<GlobalBottomNav />);

        // All main sections should show GlobalBottomNav for consistency
        // (except when in active gameplay)
        if (!path.includes('/multiplayer') && !path.includes('/singleplayer')) {
          expect(screen.queryByLabelText(/home/i)).toBeInTheDocument();
        }

        unmount();
      });
    });
  });
});
