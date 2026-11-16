import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
const auth = vi.hoisted(() => ({ value: { isAuthenticated: true, user: { id: 'me' } as null | { id: string } } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('@/components/Avatar', () => ({ __esModule: true, default: () => <div /> }));
vi.mock('@/components/LevelBadge', () => ({ __esModule: true, default: () => <span /> }));
vi.mock('@/components/seasons/RankTierChip', () => ({ RankTierChip: () => <span /> }));
vi.mock('@/components/friends/FriendQuickAction', () => ({ FriendQuickAction: () => <span data-testid="friend-action" /> }));
const track = vi.hoisted(() => vi.fn());
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: track }));
const friendCtx = vi.hoisted(() => ({ value: null as null | Record<string, unknown> }));
vi.mock('@/components/friends/FriendStatusContext', () => ({ useFriendStatus: () => friendCtx.value }));
vi.mock('../resolveBoardPlayer', () => ({ resolveBoardPlayer: vi.fn() }));
const getQuery = vi.hoisted(() => vi.fn());
vi.mock('@/lib/trpc', () => ({
  trpc: { playerProfile: { get: { useQuery: (...a: unknown[]) => getQuery(...a) } } },
}));

import { PlayerSummaryDialog } from '../PlayerSummaryDialog';

const PROFILE = { id: 'u-1', username: 'dana_w', displayName: 'Dana', currentLevel: 4, totalScore: 10, totalGames: 3, winRate: 30 };

function open(player: Record<string, unknown>) {
  return render(<PlayerSummaryDialog player={{ name: 'Dana', ...player }} open onOpenChange={() => {}} surface="daily_leaderboard" />);
}

beforeEach(() => {
  auth.value = { isAuthenticated: true, user: { id: 'me' } };
  friendCtx.value = null;
  track.mockReset();
  getQuery.mockReturnValue({ data: PROFILE, isLoading: false, isError: false });
});

describe('PlayerSummaryDialog — challenge', () => {
  it('Given a friend, Then Challenge opens a room and sends them the invite', () => {
    friendCtx.value = { relationFor: () => 'friend', boardDate: null };
    open({ id: 'u-1' });
    expect(screen.getByTestId('player-summary-challenge')).toHaveAttribute('href', '/en/multiplayer?invite=u-1');
  });

  it('Given a signed-in viewer on another player, Then Challenge links to the existing auto-create room flow', () => {
    open({ id: 'u-1' });
    const link = screen.getByTestId('player-summary-challenge');
    expect(link).toHaveAttribute('href', '/en/multiplayer?autoCreate=true');
    expect(link).toHaveTextContent('profile.challenge');
    expect(screen.getByTestId('player-summary-profile-link')).toBeInTheDocument();
    fireEvent.click(link);
    expect(track).toHaveBeenCalledWith('player_summary_challenge_clicked', { surface: 'daily_leaderboard' });
  });

  it('Given the viewer opens their own card, Then there is no Challenge', () => {
    auth.value = { isAuthenticated: true, user: { id: 'u-1' } };
    open({ id: 'u-1' });
    expect(screen.queryByTestId('player-summary-challenge')).toBeNull();
    expect(screen.getByTestId('player-summary-profile-link')).toBeInTheDocument();
  });

  it('Given the board context marks the row as self, Then there is no Challenge', () => {
    friendCtx.value = { relationFor: () => 'self', boardDate: null };
    open({ id: 'u-1' });
    expect(screen.queryByTestId('player-summary-challenge')).toBeNull();
  });

  it('Given a guest viewer, Then there is no Challenge', () => {
    auth.value = { isAuthenticated: false, user: null };
    open({ id: 'u-1' });
    expect(screen.queryByTestId('player-summary-challenge')).toBeNull();
  });

  it('Given a guest/bot row with no account, Then there is no Challenge', () => {
    getQuery.mockReturnValue({ data: undefined, isLoading: false, isError: false });
    open({});
    expect(screen.queryByTestId('player-summary-challenge')).toBeNull();
  });
});
