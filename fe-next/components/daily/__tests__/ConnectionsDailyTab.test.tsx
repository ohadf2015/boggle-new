/**
 * ConnectionsDailyTab — the Connections (Word Bridge) panel inside the shared
 * TabbedDailyLeaderboard (slice 3 of the 2026-09-13 directive).
 *
 * Connections daily scores live in their own store served by
 * /api/connections/daily/[date]/leaderboard, so they surface as their own tab
 * on the SAME leaderboard surface wheel/hunt use. These tests pin the fetch
 * contract (endpoint + guest fingerprint), row rendering, own-rank highlight,
 * and the empty/error branches.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConnectionsDailyTab from '../ConnectionsDailyTab';
import type { LeaderboardResult } from '@/lib/connections/dailyClient';

const fetchDailyLeaderboardMock = vi.fn();
vi.mock('@/lib/connections/dailyClient', () => ({
  fetchDailyLeaderboard: (...args: unknown[]) => fetchDailyLeaderboardMock(...args),
  getGuestFingerprint: () => 'guest-fp-test',
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, arg?: unknown) => {
      const dict: Record<string, string> = {
        'errors.failedToLoadLeaderboard': 'Leaderboard took a detour — refresh?',
        'common.retry': 'Try Again',
        'connections.daily.empty': 'Be the first to play today!',
        'connections.daily.players': '{count} players today',
        'connections.daily.yourRank': 'You: #{rank}',
      };
      let s = dict[k] ?? k;
      if (arg && typeof arg === 'object') {
        for (const [key, val] of Object.entries(arg as Record<string, unknown>)) {
          s = s.replace(`{${key}}`, String(val));
        }
      }
      return s;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar-stub" />,
}));

const ROWS: LeaderboardResult = {
  success: true,
  puzzleDate: '2026-09-14',
  totalPlayers: 3,
  ownRank: 2,
  leaderboard: [
    {
      rank_position: 1, display_name: 'Speedy', avatar_emoji: '🦊', avatar_color: '#fff',
      avatar_image: null, custom_avatar: null, score: 500, time_taken_seconds: 95,
      streak: 4, puzzles_solved: 5, language: 'en',
    },
    {
      rank_position: 2, display_name: 'Me', avatar_emoji: '🐸', avatar_color: '#eee',
      avatar_image: null, custom_avatar: null, score: 400, time_taken_seconds: 140,
      streak: 1, puzzles_solved: 4, language: 'he',
    },
  ],
};

describe('ConnectionsDailyTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches today\'s connections leaderboard with the guest fingerprint and renders rows', async () => {
    fetchDailyLeaderboardMock.mockResolvedValue(ROWS);
    render(<ConnectionsDailyTab puzzleDate="2026-09-14" />);

    await screen.findByTestId('connections-daily-tab');
    expect(fetchDailyLeaderboardMock).toHaveBeenCalledWith('2026-09-14', {
      guestFingerprint: 'guest-fp-test',
      limit: 100,
    });
    expect(screen.getByText('Speedy')).toBeInTheDocument();
    expect(screen.getByText('Me')).toBeInTheDocument();
    // Scores + formatted times
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('1:35')).toBeInTheDocument();
    expect(screen.getByText('3 players today')).toBeInTheDocument();
  });

  it('highlights the caller\'s own row and shows their rank', async () => {
    fetchDailyLeaderboardMock.mockResolvedValue(ROWS);
    render(<ConnectionsDailyTab puzzleDate="2026-09-14" />);

    await screen.findByTestId('connections-daily-tab');
    expect(screen.getByTestId('connections-row-2')).toHaveAttribute('data-own', 'true');
    expect(screen.getByTestId('connections-row-1')).toHaveAttribute('data-own', 'false');
    expect(screen.getByTestId('connections-own-rank')).toHaveTextContent('You: #2');
  });

  it('shows the empty state when nobody has played', async () => {
    fetchDailyLeaderboardMock.mockResolvedValue({ ...ROWS, leaderboard: [], totalPlayers: 0, ownRank: null });
    render(<ConnectionsDailyTab puzzleDate="2026-09-14" />);

    expect(await screen.findByTestId('connections-daily-tab-empty')).toBeInTheDocument();
  });

  it('shows an error with a working retry when the fetch fails', async () => {
    fetchDailyLeaderboardMock.mockResolvedValueOnce(null);
    render(<ConnectionsDailyTab puzzleDate="2026-09-14" />);

    expect(await screen.findByTestId('connections-daily-tab-error')).toBeInTheDocument();

    fetchDailyLeaderboardMock.mockResolvedValueOnce(ROWS);
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    await waitFor(() => expect(screen.getByTestId('connections-daily-tab')).toBeInTheDocument());
    expect(screen.getByText('Speedy')).toBeInTheDocument();
  });
});
