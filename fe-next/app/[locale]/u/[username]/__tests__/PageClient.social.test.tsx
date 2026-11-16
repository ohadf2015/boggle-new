import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
const auth = vi.hoisted(() => ({ value: { user: null as null | { id: string }, isAuthenticated: false, loading: false } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('@/components/AutoHideHeader', () => ({ default: () => null }));
vi.mock('@/components/avatar/AvatarRenderer', () => ({ __esModule: true, default: () => <div /> }));
vi.mock('@/lib/avatar/catalog', () => ({ PartThumb: () => <span /> }));
vi.mock('@/hooks/useSeasonBadges', () => ({ useSeasonBadges: () => ({ badges: [], isLoading: false }) }));
vi.mock('@/components/seasons/SeasonTrophyCase', () => ({ SeasonTrophyCase: () => null }));
vi.mock('@/components/seasons/SeasonRankCard', () => ({ SeasonRankCard: () => null }));
vi.mock('@/lib/avatar/avatarTelemetry', () => ({ trackProfileViewed: vi.fn() }));
vi.mock('@/components/friends/FriendQuickAction', () => ({
  FriendQuickAction: ({ userId }: { userId: string }) => <span data-testid="friend-action">{userId}</span>,
}));
vi.mock('@/components/friends/FriendStatusContext', () => ({
  FriendStatusProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useFriendStatus: () => ({ relationFor: () => 'none' }),
}));
const getQuery = vi.fn();
vi.mock('@/lib/trpc', () => ({
  trpc: { playerProfile: { get: { useQuery: (...a: unknown[]) => getQuery(...a) } } },
}));

import PublicProfilePageClient from '../PageClient';

const payload = { id: 'abc-123', username: 'ron', displayName: 'Ron', currentLevel: 7, totalXp: 900, totalGames: 40, totalScore: 100, winRate: 25, achievementCounts: {} };

beforeEach(() => {
  getQuery.mockReturnValue({ data: payload, isLoading: false, isError: false });
  auth.value = { user: { id: 'me' }, isAuthenticated: true, loading: false };
});

describe('/u/[username] — challenge + add friend', () => {
  it('Given a signed-in stranger, Then Challenge (by account id) and the friend action show next to Share', () => {
    render(<PublicProfilePageClient username="ron" />);
    expect(screen.getByTestId('profile-challenge')).toHaveAttribute('href', '/en/multiplayer?autoCreate=true');
    expect(screen.getByTestId('friend-action')).toHaveTextContent('abc-123');
    expect(screen.getByRole('button', { name: 'profile.showcase.shareProfile' })).toBeInTheDocument();
  });

  it('Given the owner, Then neither Challenge nor the friend action shows', () => {
    auth.value = { user: { id: 'abc-123' }, isAuthenticated: true, loading: false };
    render(<PublicProfilePageClient username="ron" />);
    expect(screen.queryByTestId('profile-challenge')).toBeNull();
    expect(screen.queryByTestId('friend-action')).toBeNull();
  });

  it('Given a guest, Then Challenge shows (same as /player) but no friend action', () => {
    auth.value = { user: null, isAuthenticated: false, loading: false };
    render(<PublicProfilePageClient username="ron" />);
    expect(screen.getByTestId('profile-challenge')).toBeInTheDocument();
    expect(screen.queryByTestId('friend-action')).toBeNull();
  });
});
