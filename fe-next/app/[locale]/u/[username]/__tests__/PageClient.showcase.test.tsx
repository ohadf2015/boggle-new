import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: unknown) => (p && typeof p === 'object' ? `${k}|${Object.values(p as object).join(',')}` : k), language: 'en' }),
}));
const auth = vi.hoisted(() => ({ value: { user: null as null | { id: string }, loading: false } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('@/components/AutoHideHeader', () => ({ default: () => null }));
vi.mock('@/components/avatar/AvatarRenderer', () => ({ __esModule: true, default: () => <div data-testid="stage-avatar" /> }));
vi.mock('@/lib/avatar/catalog', () => ({ PartThumb: () => <span /> }));
vi.mock('@/hooks/useSeasonBadges', () => ({ useSeasonBadges: () => ({ badges: [], isLoading: false }) }));
vi.mock('@/components/seasons/SeasonTrophyCase', () => ({ SeasonTrophyCase: () => null }));
vi.mock('@/components/seasons/SeasonRankCard', () => ({ SeasonRankCard: () => null }));
const trackProfileViewed = vi.hoisted(() => vi.fn());
vi.mock('@/lib/avatar/avatarTelemetry', () => ({ trackProfileViewed }));

const getQuery = vi.fn();
vi.mock('@/lib/trpc', () => ({
  trpc: { playerProfile: { get: { useQuery: (...a: unknown[]) => getQuery(...a) } } },
}));

import PublicProfilePageClient from '../PageClient';

const payload = {
  id: 'abc-123',
  username: 'ron',
  displayName: 'Ron',
  countryCode: 'IL',
  currentLevel: 7,
  totalXp: 900,
  totalGames: 40,
  totalScore: 100,
  winRate: 25,
  longestWord: 'quixotic',
  achievementCounts: {},
};

describe('PublicProfilePageClient — showcase stage', () => {
  beforeEach(() => {
    trackProfileViewed.mockClear();
    auth.value = { user: null, loading: false };
  });

  it('Given an old cached payload (no totalWins/ownedAvatarParts), Then the stage still renders with derived wins', () => {
    getQuery.mockReturnValue({ data: payload, isLoading: false, isError: false });
    render(<PublicProfilePageClient username="ron" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ron');
    expect(screen.getByText('@ron')).toBeInTheDocument();
    const tiles = screen.getAllByTestId('stage-stat');
    expect(tiles[0]).toHaveTextContent('QUIXOTIC');
    expect(tiles[1]).toHaveTextContent('profile.showcase.stats.wins');
    expect(screen.getByRole('button', { name: 'profile.showcase.shareProfile' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'profile.showcase.editAvatar' })).toBeNull();
  });

  it('Given owned parts, Then the collection chip counts them', () => {
    getQuery.mockReturnValue({ data: { ...payload, currentLevel: 1, totalWins: 10, ownedAvatarParts: [] }, isLoading: false, isError: false });
    render(<PublicProfilePageClient username="ron" />);
    expect(screen.getByTestId('stage-collection')).toHaveTextContent(/profile\.showcase\.parts\|0,\d+/);
  });

  it('Given a stranger viewing, Then profile_viewed fires once with isOwn=false', () => {
    getQuery.mockReturnValue({ data: payload, isLoading: false, isError: false });
    const { rerender } = render(<PublicProfilePageClient username="ron" />);
    rerender(<PublicProfilePageClient username="ron" />);
    expect(trackProfileViewed).toHaveBeenCalledTimes(1);
    expect(trackProfileViewed).toHaveBeenCalledWith('direct', false);
  });

  it('Given the owner while auth is loading, Then it waits and logs isOwn=true once resolved', () => {
    getQuery.mockReturnValue({ data: payload, isLoading: false, isError: false });
    auth.value = { user: null, loading: true };
    const { rerender } = render(<PublicProfilePageClient username="ron" />);
    expect(trackProfileViewed).not.toHaveBeenCalled();
    auth.value = { user: { id: 'abc-123' }, loading: false };
    rerender(<PublicProfilePageClient username="ron" />);
    expect(trackProfileViewed).toHaveBeenCalledTimes(1);
    expect(trackProfileViewed).toHaveBeenCalledWith('direct', true);
  });
});
