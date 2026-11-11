import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';


const push = vi.fn();
const { board, auth } = vi.hoisted(() => ({
  auth: { user: { id: 'me' }, profile: null, loading: false, isSupabaseEnabled: true },
  board: {
    data: ['a', 'b', 'c', 'd'].map((id, i) => ({ player_id: id, display_name: id.toUpperCase(), total_score: 9 - i })),
    loading: false,
    error: null,
    refetch: () => undefined,
  },
}));
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

vi.mock('@/utils/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }));

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => auth,
}));

vi.mock('@/hooks/useSupabaseRealtime', () => ({
  useLeaderboard: () => board,
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

vi.mock('@/components/records/HallOfFame', () => ({
  HallOfFame: ({ viewerId }: { viewerId?: string }) => <div data-testid="hall-of-fame">{viewerId}</div>,
}));
vi.mock('@/components/records/RecordHolderCrown', () => ({
  RecordHolderCrown: ({ userId }: { userId: string }) => <span data-testid={`crown-${userId}`} />,
}));

import LeaderboardPageClient from '../PageClient';

describe('Leaderboard world records', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ data: [] }) })));
    window.history.replaceState(null, '', '/en/leaderboard');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the hall of fame from its tab, for the signed-in viewer', () => {
    render(<LeaderboardPageClient />);
    expect(screen.queryByTestId('hall-of-fame')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'worldRecords.tab' }));
    expect(screen.getByTestId('hall-of-fame').textContent).toBe('me');
  });

  it('lands on the hall of fame from a record-broken push link', () => {
    window.history.replaceState(null, '', '/en/leaderboard?tab=records');
    render(<LeaderboardPageClient />);
    expect(screen.getByTestId('hall-of-fame')).toBeTruthy();
  });

  it('puts the record-holder crown check beside each ranked player', () => {
    render(<LeaderboardPageClient />);
    expect(screen.getByTestId('crown-d')).toBeTruthy();
  });
});
