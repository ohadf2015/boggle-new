import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaderboardTeaser } from '../LeaderboardTeaser';
import { LanguageProvider } from '@/contexts/LanguageContext';

/*
 * "On the daily challenge page show all players, not just the first 3": the hub
 * teaser asked the API for limit=3. It now asks for the whole board, shows the
 * first ten, and folds the rest behind one "show all" tap.
 */

vi.mock('@/utils/dailyChallenge/guestPlayer', () => ({
  getGuestFingerprint: vi.fn(async () => ''),
}));

const entry = (rank: number, extra: Record<string, unknown> = {}) => ({
  rank,
  key: `k${rank}`,
  name: `P${rank}`,
  customAvatar: null,
  total: 1000 - rank,
  byMode: { 'word-hunt': 0, 'word-wheel': 1000 - rank, 'word-tower': 0, connections: 0 },
  towerHeightM: null,
  playedModes: ['word-wheel'],
  ...extra,
});

function mockBoard(entries: unknown[]) {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ data: entries }) }),
  ) as unknown as typeof fetch;
}

const renderBoard = () =>
  render(
    <LanguageProvider initialLanguage="en">
      <LeaderboardTeaser currentLanguage="en" />
    </LanguageProvider>,
  );

describe('LeaderboardTeaser — every player, not just the podium', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks for the whole board, not the top 3', async () => {
    mockBoard([]);
    renderBoard();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const url = String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(url).not.toContain('limit=3&');
    expect(url).toMatch(/limit=100\b/);
  });

  it('lists every player on a small board, with their rank past the podium', async () => {
    mockBoard([1, 2, 3, 4, 5, 6].map((r) => entry(r)));
    renderBoard();
    for (const rank of [1, 2, 3, 4, 5, 6]) {
      expect(await screen.findByTestId(`leaderboard-row-${rank}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('leaderboard-row-6').textContent).toContain('#6');
    expect(screen.queryByTestId('leaderboard-show-all')).toBeNull();
  });

  it('folds a long board after ten rows and shows the rest on one tap, keeping the viewer visible', async () => {
    mockBoard(Array.from({ length: 14 }, (_, i) => entry(i + 1, i + 1 === 13 ? { isYou: true } : {})));
    renderBoard();
    expect(await screen.findByTestId('leaderboard-row-10')).toBeInTheDocument();
    expect(screen.queryByTestId('leaderboard-row-11')).toBeNull();
    expect(screen.getByTestId('leaderboard-row-13')).toHaveAttribute('data-you', 'true');

    const more = screen.getByTestId('leaderboard-show-all');
    expect(more.textContent).toContain('14');
    await userEvent.click(more);
    for (const rank of [11, 12, 14]) expect(screen.getByTestId(`leaderboard-row-${rank}`)).toBeInTheDocument();
    expect(screen.queryByTestId('leaderboard-show-all')).toBeNull();
  });
});
