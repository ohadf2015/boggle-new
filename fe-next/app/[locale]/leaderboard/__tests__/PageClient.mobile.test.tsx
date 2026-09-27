import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('framer-motion', () => {
  const passthrough = ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  );
  return { m: new Proxy({}, { get: () => passthrough }) };
});

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'me' }, profile: null, isSupabaseEnabled: true }),
}));

vi.mock('@/hooks/useSupabaseRealtime', () => ({
  useLeaderboard: () => ({
    data: [
      { player_id: 'a', display_name: 'Ada', total_score: 3000, games_played: 10 },
      { player_id: 'b', display_name: 'Ben', total_score: 2000, games_played: 8 },
      { player_id: 'c', display_name: 'Cy', total_score: 1000, games_played: 6 },
      { player_id: 'd', display_name: 'Dee', total_score: 400, games_played: 4 },
      { player_id: 'e', display_name: 'Eve', total_score: 200, games_played: 2 },
    ],
    loading: false,
    error: null,
    subscriptionStatus: 'SUBSCRIBED',
    refetch: vi.fn(),
  }),
  useUserRank: () => ({ rank: null }),
}));

vi.mock('@/hooks/useTierPromotion', () => ({ useTierPromotion: () => undefined }));
vi.mock('@/hooks/useTierPosition', () => ({ useTierPosition: () => ({ data: null }) }));
vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: 'control', trackExposure: vi.fn() }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/components/layout/PageLayout', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/layout/PageStateHandler', () => ({
  PageStateHandler: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/Avatar', () => ({
  default: () => <div data-testid="avatar" />,
}));
vi.mock('@/components/ads', () => ({ InlineBannerAd: () => null }));
vi.mock('@/components/referral/ReferralShareBanner', () => ({ default: () => null }));
vi.mock('@/components/ui/TierBadge', () => ({
  TierBadge: () => null,
  TierProgressBar: () => null,
}));
vi.mock('@/components/leaderboard/LeaderboardPodium', () => ({
  default: () => <div data-testid="podium" />,
}));
vi.mock('../LeaderboardPlayCta', () => ({ LeaderboardPlayCta: () => null }));
vi.mock('@/components/seasons/SeasonLeaderboardTabs', () => ({
  SeasonLeaderboardTabs: () => null,
  seasonScopeLabelKey: () => 'leaderboard.allTime',
}));
vi.mock('@/lib/ranked/leaderboardTiers', () => ({
  getGlobalLeaderboardTier: () => 'bronze',
  getLeaderboardTierProgress: () => 0,
  getNextTierThreshold: () => 0,
  GLOBAL_LEADERBOARD_TIERS: [],
}));
vi.mock('@/components/ui/Loader', () => ({ Loader: () => null }));
vi.mock('@/components/ui/EnhancedLoading', () => ({ SkeletonCard: () => null }));
vi.mock('@/components/ui/EnhancedEmptyState', () => ({
  ErrorState: () => null,
  EnhancedEmptyState: () => null,
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.PropsWithChildren<{ onClick?: () => void }>) => (
    <button type="button" onClick={onClick} {...props}>{children}</button>
  ),
}));

import LeaderboardPageClient from '../PageClient';

describe('Leaderboard PageClient mobile layout', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('shouldWrapTheTableInAHorizontalScrollContainerWithFixedColumns', () => {
    // GIVEN a populated leaderboard on a narrow viewport
    render(<LeaderboardPageClient />);

    // WHEN the table wrapper is inspected
    const scroller = screen.getByTestId('leaderboard-table-scroll');

    // THEN it scrolls horizontally instead of stacking rank/avatar/score
    expect(scroller.className).toMatch(/overflow-x-auto/);
    const table = screen.getByTestId('leaderboard-table');
    expect(table.className).toMatch(/min-w-/);
    expect(screen.getByTestId('leaderboard-table-header').className).toMatch(/grid-cols-10/);
    expect(screen.getByText('Dee').closest('[data-testid="leaderboard-row"]')?.className).toMatch(
      /grid-cols-10/,
    );
    expect(screen.getByText('Dee').closest('[data-testid="leaderboard-row"]')?.className).not.toMatch(
      /flex-col/,
    );
  });

  it('shouldRouteTheTopHomeButtonToTheCurrentLocaleHomepage', () => {
    render(<LeaderboardPageClient />);
    fireEvent.click(screen.getByTestId('leaderboard-home'));
    expect(push).toHaveBeenCalledWith('/en');
  });
});
