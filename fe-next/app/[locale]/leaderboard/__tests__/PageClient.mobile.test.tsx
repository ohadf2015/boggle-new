import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const push = vi.fn();
let authState: { user: { id: string } | null; profile: Record<string, unknown> | null } = { user: null, profile: null };
let rankState: { total_score?: number; rank_position?: number } | null = null;
let rankLoading = false;
let authLoading = false;
let onCrazyGames = false;

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
  useAuth: () => ({ ...authState, loading: authLoading, isSupabaseEnabled: true }),
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
  useUserRank: () => ({ rank: rankState, loading: rankLoading }),
}));

vi.mock('@/hooks/useTierPromotion', () => ({ useTierPromotion: () => undefined }));
vi.mock('@/hooks/useTierPosition', () => ({ useTierPosition: () => ({ data: null }) }));
vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: 'control', trackExposure: vi.fn() }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: onCrazyGames }),
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
vi.mock('@/components/ui/TierBadge', () => ({
  TierBadge: () => null,
  TierProgressBar: () => null,
}));
vi.mock('@/components/leaderboard/LeaderboardPodium', () => ({
  default: () => <div data-testid="podium" />,
}));
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

describe('Leaderboard PageClient', () => {
  beforeEach(() => {
    push.mockClear();
    authState = { user: null, profile: null };
    rankState = null;
    rankLoading = false;
    authLoading = false;
    onCrazyGames = false;
  });

  it('shouldKeepRankPlayerAndScoreOnScreenWithoutHorizontalScroll', () => {
    render(<LeaderboardPageClient />);

    expect(screen.queryByTestId('leaderboard-table-scroll')).toBeNull();
    const table = screen.getByTestId('leaderboard-table');
    expect(table.className).not.toMatch(/min-w-/);
    const row = screen.getByText('Dee').closest('[data-testid="leaderboard-row"]');
    expect(row?.textContent).toContain('400');
    expect(screen.queryByText('leaderboard.games')).toBeNull();
  });

  it('shouldLeaveBackNavigationToTheAppChrome', () => {
    render(<LeaderboardPageClient />);
    expect(screen.queryByLabelText('common.backToMenu')).toBeNull();
    expect(screen.queryByText('common.backToMenu')).toBeNull();
  });

  it('shouldKeepAPageBackButtonOnCrazyGamesWhereTheAppHeaderIsHidden', () => {
    onCrazyGames = true;
    render(<LeaderboardPageClient />);
    fireEvent.click(screen.getByTestId('leaderboard-home'));
    expect(push).toHaveBeenCalledWith('/en');
  });

  it('shouldLabelTheTabsPlayersAndCreators', () => {
    render(<LeaderboardPageClient />);
    expect(screen.getByRole('tab', { name: 'leaderboard.players' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'ugc.creator.stats' })).toBeTruthy();
  });

  it('shouldInviteAGuestToPlayFromTheYouCard', () => {
    render(<LeaderboardPageClient />);
    const card = screen.getByTestId('leaderboard-you');
    expect(card.textContent).toContain('leaderboard.noRankYet');
    fireEvent.click(screen.getByRole('button', { name: 'common.playNow' }));
    expect(push).toHaveBeenCalledWith('/en/singleplayer');
  });

  it('shouldShowARankedPlayerTheirRankAndThePointsToPassThePlayerAbove', () => {
    authState = { user: { id: 'e' }, profile: { avatar_config: null } };
    rankState = { rank_position: 5, total_score: 200 };
    render(<LeaderboardPageClient />);

    const card = screen.getByTestId('leaderboard-you');
    expect(card.textContent).toContain('#5');
    expect(card.textContent).toContain('201');
    expect(card.textContent).toContain('Dee');
    expect(screen.getByText('Eve').closest('[data-testid="leaderboard-row"]')?.getAttribute('aria-current')).toBe('true');
  });

  it('shouldNotFlashThePlayPromptWhileASignedInPlayersRankIsLoading', () => {
    authState = { user: { id: 'e' }, profile: { avatar_config: null } };
    rankLoading = true;
    render(<LeaderboardPageClient />);
    expect(screen.getByTestId('leaderboard-you-pending')).toBeTruthy();
    expect(screen.queryByText('common.playNow')).toBeNull();
  });

  it('shouldNotFlashThePlayPromptWhileAuthIsResolving', () => {
    authLoading = true;
    render(<LeaderboardPageClient />);
    expect(screen.queryByText('common.playNow')).toBeNull();
  });

  it('shouldNeverOfferThePlayerThemselvesAsThePassTarget', () => {
    authState = { user: { id: 'e' }, profile: { avatar_config: null } };
    rankState = { rank_position: 6, total_score: 200 };
    render(<LeaderboardPageClient />);
    expect(screen.getByTestId('leaderboard-you').textContent).not.toContain('Eve');
  });

  it('shouldCongratulateTheLeaderInsteadOfAPassTarget', () => {
    authState = { user: { id: 'a' }, profile: { avatar_config: null } };
    rankState = { rank_position: 1, total_score: 3000 };
    render(<LeaderboardPageClient />);
    expect(screen.getByTestId('leaderboard-you').textContent).toContain('leaderboard.youAreFirst');
  });
});
