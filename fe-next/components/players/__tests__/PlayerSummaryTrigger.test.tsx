import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'he' }) }));
const auth = vi.hoisted(() => ({ isAuthenticated: true }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/components/Avatar', () => ({ __esModule: true, default: () => <div data-testid="avatar" /> }));
vi.mock('@/components/LevelBadge', () => ({ __esModule: true, default: ({ level }: { level: number }) => <span data-testid="level">{level}</span> }));
vi.mock('@/components/seasons/RankTierChip', () => ({ RankTierChip: ({ tier }: { tier: string }) => <span data-testid="tier">{tier}</span> }));
vi.mock('@/components/friends/FriendQuickAction', () => ({
  FriendQuickAction: ({ userId }: { userId: string }) => <span data-testid="friend-action">{userId}</span>,
}));
const track = vi.hoisted(() => vi.fn());
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: track }));

const friendCtx = vi.hoisted(() => ({ value: null as null | Record<string, unknown> }));
vi.mock('@/components/friends/FriendStatusContext', () => ({ useFriendStatus: () => friendCtx.value }));

const getQuery = vi.hoisted(() => vi.fn());
vi.mock('@/lib/trpc', () => ({
  trpc: { playerProfile: { get: { useQuery: (...a: unknown[]) => getQuery(...a) } } },
}));

import { PlayerSummaryTrigger } from '../PlayerSummaryTrigger';

const PROFILE = {
  id: 'u-1',
  username: 'dana_w',
  displayName: 'Dana',
  currentLevel: 12,
  totalScore: 12000,
  totalGames: 40,
  totalWins: 22,
  winRate: 55,
  longestWord: 'quixotic',
};

beforeEach(() => {
  getQuery.mockReset();
  getQuery.mockReturnValue({ data: undefined, isLoading: false, isError: false });
  friendCtx.value = null;
  auth.isAuthenticated = true;
  track.mockReset();
});

describe('PlayerSummaryTrigger', () => {
  it('renders the child untouched for a guest row (no id, no key)', () => {
    render(<PlayerSummaryTrigger player={{ name: 'Guest' }} surface="t"><span>Guest</span></PlayerSummaryTrigger>);
    expect(screen.queryByTestId('player-summary-trigger')).toBeNull();
  });

  it('mounts no card until tapped', () => {
    render(<PlayerSummaryTrigger player={{ id: 'u-1', name: 'Dana' }} surface="t"><span>Dana</span></PlayerSummaryTrigger>);
    expect(screen.queryByTestId('player-summary')).toBeNull();
    expect(getQuery).not.toHaveBeenCalled();
  });

  it('opens the card with level, rank, stats and the profile link', () => {
    getQuery.mockReturnValue({ data: PROFILE, isLoading: false, isError: false });
    render(<PlayerSummaryTrigger player={{ id: 'u-1', name: 'Dana', title: 'Wordsmith' }} surface="daily_leaderboard"><span>Dana</span></PlayerSummaryTrigger>);
    fireEvent.click(screen.getByTestId('player-summary-trigger'));

    expect(screen.getByTestId('player-summary')).toBeInTheDocument();
    expect(getQuery).toHaveBeenCalledWith({ id: 'u-1' }, expect.objectContaining({ enabled: true }));
    expect(screen.getByTestId('level')).toHaveTextContent('12');
    expect(screen.getByTestId('tier')).toHaveTextContent('gold');
    expect(screen.getByText('@dana_w')).toBeInTheDocument();
    expect(screen.getByTestId('title-badge')).toBeInTheDocument();
    expect(screen.getAllByTestId('stage-stat')).toHaveLength(3);
    expect(screen.getByTestId('player-summary-profile-link')).toHaveAttribute('href', '/he/player/u-1');
    expect(screen.getByTestId('friend-action')).toHaveTextContent('u-1');
    expect(track).toHaveBeenCalledWith('player_summary_opened', { surface: 'daily_leaderboard' });
  });

  it('opens from the keyboard', () => {
    render(<PlayerSummaryTrigger player={{ id: 'u-1', name: 'Dana' }} surface="t" labelled><span /></PlayerSummaryTrigger>);
    const trigger = screen.getByRole('button', { name: 'playerSummary.openFor' });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByTestId('player-summary')).toBeInTheDocument();
  });

  it('resolves a daily board key for a signed-in viewer, then links the profile', async () => {
    const resolveBoardKey = vi.fn(async () => 'u-9');
    friendCtx.value = { isAuthenticated: true, boardDate: '2026-11-14', resolveBoardKey };
    getQuery.mockImplementation(({ id }: { id: string }) =>
      id ? { data: { ...PROFILE, id }, isLoading: false, isError: false } : { data: undefined, isLoading: false, isError: false });

    render(<PlayerSummaryTrigger player={{ boardKey: 'rowkey123', name: 'Dana' }} surface="t"><span>Dana</span></PlayerSummaryTrigger>);
    fireEvent.click(screen.getByTestId('player-summary-trigger'));

    await waitFor(() => expect(screen.getByTestId('player-summary-profile-link')).toHaveAttribute('href', '/he/player/u-9'));
    expect(resolveBoardKey).toHaveBeenCalledWith('rowkey123');
  });

  it('asks a signed-out viewer to sign in for a board-key row, with no link', () => {
    auth.isAuthenticated = false;
    render(<PlayerSummaryTrigger player={{ boardKey: 'rowkey123', name: 'Dana' }} surface="t"><span>Dana</span></PlayerSummaryTrigger>);
    fireEvent.click(screen.getByTestId('player-summary-trigger'));
    expect(screen.getByTestId('player-summary-note')).toHaveTextContent('playerSummary.signInToSee');
    expect(screen.queryByTestId('player-summary-profile-link')).toBeNull();
  });

  it('keeps the link when the stats fail to load', () => {
    getQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<PlayerSummaryTrigger player={{ id: 'u-1', name: 'Dana' }} surface="t"><span>Dana</span></PlayerSummaryTrigger>);
    fireEvent.click(screen.getByTestId('player-summary-trigger'));
    expect(screen.getByTestId('player-summary-note')).toHaveTextContent('playerSummary.loadFailed');
    expect(screen.getByTestId('player-summary-profile-link')).toBeInTheDocument();
  });

  it('does nothing when disabled (the viewer\'s own row)', () => {
    render(<PlayerSummaryTrigger player={{ id: 'me', name: 'Me' }} surface="t" disabled><span>Me</span></PlayerSummaryTrigger>);
    expect(screen.queryByTestId('player-summary-trigger')).toBeNull();
  });
});
