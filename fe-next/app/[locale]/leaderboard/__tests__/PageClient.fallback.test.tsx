import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Regression: without the public Supabase env vars the page used to render a
// "Coming soon" stub (a dead end linked from the nav as "Ranks" on every
// page). It must now fall back to the cached /api/leaderboard route and render
// real rows instead.

const push = vi.fn();
let fetchMock: ReturnType<typeof vi.fn>;

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

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, loading: false, isSupabaseEnabled: false }),
}));

vi.mock('@/hooks/useSupabaseRealtime', () => ({
  useLeaderboard: () => ({ data: [], loading: true, error: null, refetch: vi.fn() }),
  useUserRank: () => ({ rank: null, loading: false }),
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

const STATIC_ENTRIES = [
  { player_id: 'a', display_name: 'Ada', total_score: 3000, games_played: 10 },
  { player_id: 'b', display_name: 'Ben', total_score: 2000, games_played: 8 },
  { player_id: 'c', display_name: 'Cy', total_score: 1000, games_played: 6 },
  { player_id: 'd', display_name: 'Dee', total_score: 400, games_played: 4 },
  { player_id: 'e', display_name: 'Eve', total_score: 200, games_played: 2 },
  { player_id: 'f', display_name: 'Fay', total_score: 100, games_played: 1 },
];

describe('Leaderboard PageClient without Supabase (static fallback)', () => {
  beforeEach(() => {
    push.mockClear();
    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: STATIC_ENTRIES }),
    }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches the cached /api/leaderboard route instead of showing the coming-soon stub', async () => {
    render(<LeaderboardPageClient />);

    expect(fetchMock).toHaveBeenCalledWith('/api/leaderboard', { cache: 'no-store' });

    // Rows from the static endpoint render — no dead-end stub copy. The top 3
    // go to the podium (mocked here), so the row list starts at rank 4.
    expect(await screen.findByText('Dee')).toBeTruthy();
    expect(screen.getByText('Eve')).toBeTruthy();
    expect(screen.getAllByTestId('leaderboard-row').length).toBe(3);
    expect(screen.getByTestId('podium')).toBeTruthy();
    expect(screen.queryByText('leaderboard.comingSoon')).toBeNull();
  });

  it('hides the supabase-only tabs when showing the static fallback', async () => {
    render(<LeaderboardPageClient />);
    await screen.findByText('Dee');
    expect(screen.queryByRole('tab')).toBeNull();
  });
});

describe('Leaderboard PageClient SSR seeding', () => {
  beforeEach(() => {
    push.mockClear();
    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: STATIC_ENTRIES }),
    }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders server-provided initialEntries immediately, without a client fetch', () => {
    render(<LeaderboardPageClient initialEntries={STATIC_ENTRIES} />);

    // Synchronous assertions — the rows come from the prop, not the fetch
    // effect, so SSR HTML and first client paint both contain rankings.
    expect(screen.getByText('Dee')).toBeTruthy();
    expect(screen.getByText('Eve')).toBeTruthy();
    expect(screen.getAllByTestId('leaderboard-row').length).toBe(3);
    expect(screen.getByTestId('podium')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
