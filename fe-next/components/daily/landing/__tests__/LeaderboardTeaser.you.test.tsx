import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaderboardTeaser } from '../LeaderboardTeaser';
import { LanguageProvider } from '@/contexts/LanguageContext';

/*
 * "I finished the daily and I'm not on the board": the teaser asked for the UI
 * locale's board only (a Hebrew solve was invisible on an English hub) and for
 * the top 3 only, with no row for the player looking at it. And the one number
 * per row was a cross-mode total, so nobody's real game score was on screen.
 */

vi.mock('@/utils/dailyChallenge/guestPlayer', () => ({
  getGuestFingerprint: vi.fn(async () => 'guestfp'),
}));

const entry = (rank: number, name: string, extra: Record<string, unknown> = {}) => ({
  rank,
  name,
  avatarEmoji: null,
  avatarColor: null,
  avatarImage: null,
  customAvatar: null,
  total: 1686,
  byMode: { 'word-hunt': 780, 'word-wheel': 906, 'word-tower': 0, connections: 0 },
  towerHeightM: null,
  playedModes: ['word-hunt', 'word-wheel'],
  ...extra,
});

function mockBoard(entries: unknown[]) {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ data: entries }) }),
  ) as unknown as typeof fetch;
}

const renderBoard = (lang: 'en' | 'he' = 'en') =>
  render(
    <LanguageProvider initialLanguage={lang}>
      <LeaderboardTeaser currentLanguage={lang} />
    </LanguageProvider>,
  );

describe('LeaderboardTeaser — the viewer and real scores', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks for every language\'s players and identifies the guest viewer', async () => {
    mockBoard([]);
    renderBoard('en');
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const url = String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(url).toContain('lang=all');
    expect(url).toContain('fp=guestfp');
  });

  it('shows the viewer\'s own row, with its real rank, when they are outside the top 3', async () => {
    mockBoard([entry(1, 'A'), entry(2, 'B'), entry(3, 'C'), entry(7, 'Fish', { isYou: true })]);
    renderBoard();
    const mine = await screen.findByTestId('leaderboard-row-7');
    expect(mine).toHaveAttribute('data-you', 'true');
    expect(mine.textContent).toContain('#7');
  });

  it('shows each game\'s real score on the row, not only the combined total', async () => {
    mockBoard([
      entry(1, 'Olys', {
        total: 290,
        byMode: { 'word-hunt': 0, 'word-wheel': 0, 'word-tower': 290, connections: 0 },
        towerHeightM: 58,
        playedModes: ['word-tower'],
      }),
      entry(2, 'Fish'),
    ]);
    renderBoard();
    const tower = await screen.findByTestId('leaderboard-row-1');
    expect(tower.textContent).toContain('58m'); // real height, not the 290 conversion alone
    const fish = screen.getByTestId('leaderboard-row-2');
    expect(fish.textContent).toContain('780');
    expect(fish.textContent).toContain('906');
  });
});
