import { vi, type Mock, } from 'vitest';
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
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock contexts
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => ({
    isInGame: false,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
  }),
}));

vi.mock('@/hooks/useSafeArea', () => ({
  useSafeArea: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

vi.mock('@/hooks/useDailyMissions', () => ({
  useDailyMissions: () => ({
    missions: [],
    completedCount: 0,
    isGrandSlam: false,
    grandSlamClaimed: false,
    loading: false,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
  }),
}));

vi.mock('@/hooks/useFriends', () => ({
  useFriends: () => ({
    pendingRequests: [],
    friends: [],
    outgoingRequests: [],
    pendingChallenges: [],
    isLoading: false,
    error: null,
  }),
}));

describe('Profile Navigation UX - Tab Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should remain visible on /friends path', () => {
    // GIVEN user is on friends page
    (usePathname as Mock).mockReturnValue('/en/friends');

    // WHEN GlobalBottomNav is rendered
    render(<GlobalBottomNav />);

    // THEN it should remain visible to maintain consistent navigation
    expect(screen.getByLabelText(/home/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/play/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/friends/i)).toBeInTheDocument();
  });

  it('should remain visible on landing page (existing behavior)', () => {
    // GIVEN user is on landing page
    (usePathname as Mock).mockReturnValue('/en');

    // WHEN GlobalBottomNav is rendered
    render(<GlobalBottomNav />);

    // THEN all main tabs should be visible
    expect(screen.getByLabelText(/home/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/play/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/friends/i)).toBeInTheDocument();
  });

  it('should show Friends tab as active when on /friends path', () => {
    // GIVEN user is on friends page
    (usePathname as Mock).mockReturnValue('/en/friends');

    // WHEN GlobalBottomNav is rendered
    render(<GlobalBottomNav />);

    // THEN Friends tab should be visible and marked as active
    const friendsTab = screen.getByLabelText(/friends/i);
    expect(friendsTab).toBeInTheDocument();
    expect(friendsTab).toHaveAttribute('aria-current', 'page');
  });

  describe('UX Requirements', () => {
    it('should maintain consistent navigation across all main sections', () => {
      // Test that GlobalBottomNav appears on all main sections
      const paths = [
        '/en',           // Landing
        '/en/leaderboard', // Leaderboard
        '/en/friends',   // Friends
      ];

      paths.forEach(path => {
        (usePathname as Mock).mockReturnValue(path);
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
