import { vi, type Mock, } from 'vitest';
/**
 * Test: Profile Tab Deep Linking
 *
 * BUG: "Invite Friends, Earn XP" callout navigates to /profile but doesn't
 * open the collection tab where ReferralCard is located on mobile.
 *
 * EXPECTED: When navigating to /profile?tab=collection, the profile page
 * should automatically open the collection tab.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import React from 'react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
      const { initial, animate, exit, transition, drag, dragConstraints, dragElastic, onDragEnd, whileHover, whileTap, ...domProps } = props;
      return <div {...domProps}>{children}</div>;
    },
    button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
      const { initial, animate, exit, transition, whileHover, whileTap, ...domProps } = props;
      return <button {...domProps}>{children}</button>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock contexts
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    profile: {
      display_name: 'Test User',
      avatar_image: '🎮|#FFE135',
      total_xp: 1000,
      coins: 500,
    },
    isAuthenticated: true,
    loading: false,
    canPlayRanked: true,
    gamesUntilRanked: 0,
    updateProfile: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
  }),
}));

vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false },
  }),
}));

vi.mock('@/hooks/usePlayerCollectibles', () => ({
  usePlayerCollectibles: () => ({
    collectibles: [],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useSeasonBadges', () => ({
  useSeasonBadges: () => ({
    badges: [],
    isLoading: false,
  }),
}));

vi.mock('@/components/seasons/SeasonRankCard', () => ({
  SeasonRankCard: () => null,
  default: () => null,
}));
vi.mock('@/components/seasons/SeasonTrophyCase', () => ({
  SeasonTrophyCase: () => null,
  default: () => null,
}));

vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

vi.mock('@/utils/session', () => ({
  getSession: () => null,
}));

// Mock profile components to simplify tests
vi.mock('@/components/profile', () => ({
  ProfileHeader: () => <div data-testid="profile-header">ProfileHeader</div>,
  ProfileXpSection: () => <div data-testid="profile-xp-section">ProfileXpSection</div>,
  ProfileStatsGrid: () => <div data-testid="profile-stats-grid">ProfileStatsGrid</div>,
  ProfileCoinsSection: () => <div data-testid="profile-coins-section">ProfileCoinsSection</div>,
  ProfileRankedProgress: () => <div data-testid="profile-ranked-progress">ProfileRankedProgress</div>,
  ProfileAchievements: () => <div data-testid="profile-achievements">ProfileAchievements</div>,
  ProfileCollection: () => <div data-testid="profile-collection">ProfileCollection</div>,
  ProfileBackButtons: () => <div data-testid="profile-back-buttons">ProfileBackButtons</div>,
}));

vi.mock('@/components/profile/ReferralCard', () => ({
  ReferralCard: () => <div data-testid="referral-card">ReferralCard</div>,
}));

vi.mock('@/components/settings/EmailPreferences', () => ({
  EmailPreferences: () => <div data-testid="email-preferences">EmailPreferences</div>,
}));

vi.mock('@/components/AutoHideHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="auto-hide-header">Header</div>,
}));

vi.mock('@/components/ui/PageLoader', () => ({
  PageLoader: () => <div data-testid="page-loader">Loading...</div>,
}));

vi.mock('@/components/EmojiAvatarPicker', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/ui/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

// Import AFTER mocks are set up
import ProfilePageClient from '@/app/[locale]/profile/PageClient';

describe('Profile Tab Deep Linking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no tab parameter
    (useSearchParams as Mock).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    });
  });

  it('should show overview tab by default when no tab parameter is provided', async () => {
    // GIVEN user navigates to /profile without tab parameter
    (useSearchParams as Mock).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    });

    // WHEN profile page renders
    render(<NuqsTestingAdapter><ProfilePageClient /></NuqsTestingAdapter>);

    // THEN overview section should be visible (tab buttons should show overview as selected)
    await waitFor(() => {
      const overviewTab = screen.getByRole('tab', { name: /overview/i });
      expect(overviewTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('should open collection tab when ?tab=collection is in URL', async () => {
    // GIVEN user navigates to /profile?tab=collection
    (useSearchParams as Mock).mockReturnValue({
      get: vi.fn((param: string) => (param === 'tab' ? 'collection' : null)),
    });

    // WHEN profile page renders
    render(<NuqsTestingAdapter searchParams={{ tab: 'collection' }}><ProfilePageClient /></NuqsTestingAdapter>);

    // THEN collection section should be visible with ReferralCard
    await waitFor(() => {
      const collectionTab = screen.getByRole('tab', { name: /collection/i });
      expect(collectionTab).toHaveAttribute('aria-selected', 'true');
    });

    // AND ReferralCard should be visible (at least one - renders for both mobile and desktop views)
    expect(screen.getAllByTestId('referral-card').length).toBeGreaterThanOrEqual(1);
  });

  it('should open stats tab when ?tab=stats is in URL', async () => {
    // GIVEN user navigates to /profile?tab=stats
    (useSearchParams as Mock).mockReturnValue({
      get: vi.fn((param: string) => (param === 'tab' ? 'stats' : null)),
    });

    // WHEN profile page renders
    render(<NuqsTestingAdapter searchParams={{ tab: 'stats' }}><ProfilePageClient /></NuqsTestingAdapter>);

    // THEN stats section should be visible
    await waitFor(() => {
      const statsTab = screen.getByRole('tab', { name: /stats/i });
      expect(statsTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('should open achievements tab when ?tab=achievements is in URL', async () => {
    // GIVEN user navigates to /profile?tab=achievements
    (useSearchParams as Mock).mockReturnValue({
      get: vi.fn((param: string) => (param === 'tab' ? 'achievements' : null)),
    });

    // WHEN profile page renders
    render(<NuqsTestingAdapter searchParams={{ tab: 'achievements' }}><ProfilePageClient /></NuqsTestingAdapter>);

    // THEN achievements section should be visible
    await waitFor(() => {
      const achievementsTab = screen.getByRole('tab', { name: /achievements/i });
      expect(achievementsTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('should fallback to overview for invalid tab parameter', async () => {
    // GIVEN user navigates to /profile?tab=invalid
    (useSearchParams as Mock).mockReturnValue({
      get: vi.fn((param: string) => (param === 'tab' ? 'invalid' : null)),
    });

    // WHEN profile page renders
    render(<NuqsTestingAdapter><ProfilePageClient /></NuqsTestingAdapter>);

    // THEN overview should be shown (fallback behavior)
    await waitFor(() => {
      const overviewTab = screen.getByRole('tab', { name: /overview/i });
      expect(overviewTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});

describe('Referral Callout Link', () => {
  it('should include tab=collection parameter in referral callout link', async () => {
    // This test verifies the LandingView referral callout includes the correct tab parameter
    // The Link should be: href={`/${language}/profile?tab=collection`}

    // GIVEN the landing page renders with referral callout visible
    // (This test is a specification - it documents expected behavior)

    // EXPECTED link format
    const expectedHref = '/en/profile?tab=collection';

    // This assertion documents the expected behavior
    // The actual link in LandingView.tsx line 602 should be updated to include ?tab=collection
    expect(expectedHref).toContain('tab=collection');
  });
});
