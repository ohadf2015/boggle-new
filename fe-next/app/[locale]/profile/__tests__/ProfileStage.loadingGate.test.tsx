import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), useSearchParams: () => ({ get: () => null }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }) }));
const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('@/hooks/usePullToRefresh', () => ({ usePullToRefresh: () => ({ pullToRefreshHandlers: {}, pullState: { pullDistance: 0, isRefreshing: false } }) }));
vi.mock('@/hooks/usePlayerCollectibles', () => ({ usePlayerCollectibles: () => ({ collectibles: [], isLoading: false }) }));
vi.mock('@/hooks/useSeasonBadges', () => ({ useSeasonBadges: () => ({ badges: [], isLoading: false }) }));
vi.mock('@/hooks/useXpByMode', () => ({ useXpByMode: () => null }));
vi.mock('@/hooks/useEngagementStatus', () => ({ useEngagementStatus: () => ({ streak: 0 }) }));
vi.mock('@/contexts/CoinContext', () => ({ useCoinContext: () => ({ spendCoins: vi.fn() }) }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }) }));
vi.mock('@/components/AutoHideHeader', () => ({ default: () => null }));
vi.mock('@/components/seasons/SeasonRankCard', () => ({ SeasonRankCard: () => null }));
vi.mock('@/components/seasons/SeasonTrophyCase', () => ({ SeasonTrophyCase: () => null }));
vi.mock('@/components/profile/WordMasteryCard', () => ({ WordMasteryCard: () => null }));
vi.mock('@/components/playerStyle/ProfileStyleCard', () => ({ ProfileStyleCard: () => null }));
vi.mock('@/components/playGames/PlayGamesCard', () => ({ PlayGamesCard: () => null }));
vi.mock('@/components/ugc/CreatorProfileStats', () => ({ default: () => null }));
vi.mock('@/components/profile/XpByModeBreakdown', () => ({ XpByModeBreakdown: () => null }));
vi.mock('@/components/profile', () => ({
  ProfileHeader: () => <div data-testid="profile-header" />,
  ProfileXpSection: () => null,
  ProfileStatsGrid: () => null,
  ProfileCoinsSection: () => null,
  ProfileRankedProgress: () => null,
  ProfileAchievements: () => null,
  ProfileCollection: () => null,
  ProfileBackButtons: () => null,
}));
const trackProfileViewed = vi.hoisted(() => vi.fn());
vi.mock('@/lib/avatar/avatarTelemetry', () => ({ trackProfileViewed }));

import ProfilePageClient from '../PageClient';

const base = { user: { id: 'u1' }, isAuthenticated: true, loading: false, isAdmin: false, updateProfile: vi.fn(), refreshProfile: vi.fn() };

describe('own profile — no fake-identity flash', () => {
  it('Given auth resolved but the profile row not yet loaded, Then shows the skeleton, not the stage', () => {
    auth.value = { ...base, profile: null };
    render(<NuqsTestingAdapter><ProfilePageClient /></NuqsTestingAdapter>);
    expect(screen.queryByTestId('profile-header')).toBeNull();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('Given the profile loaded, Then the stage + tabs render and the view is tracked once as own', () => {
    auth.value = { ...base, profile: { id: 'u1', username: 'ron', achievement_counts: {} } };
    render(<NuqsTestingAdapter><ProfilePageClient /></NuqsTestingAdapter>);
    expect(screen.getByTestId('profile-header')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(trackProfileViewed).toHaveBeenCalledTimes(1);
    expect(trackProfileViewed).toHaveBeenCalledWith('direct', true);
  });
});
