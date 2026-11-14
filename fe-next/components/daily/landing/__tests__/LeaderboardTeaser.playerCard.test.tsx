import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/*
 * "The profile still doesn't show up when clicking the profile image": on the
 * daily hub's top-players list the whole row was one expand button, so tapping
 * an avatar only opened the per-game scores. The avatar and name now open the
 * player's summary card; the rest of the row still expands.
 */

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'he' }) }));
vi.mock('@/utils/dailyChallenge/guestPlayer', () => ({ getGuestFingerprint: vi.fn(async () => '') }));
vi.mock('@/utils/dailyChallenge/dateUtils', () => ({ getDailyChallengeDate: () => '2026-11-14' }));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/components/players/PlayerSummaryDialog', () => ({
  PlayerSummaryDialog: ({ player, open }: { player: { boardKey?: string; boardDate?: string; title?: string }; open: boolean }) =>
    open ? <div data-testid="summary" data-key={player.boardKey ?? ''} data-date={player.boardDate ?? ''} data-title={player.title ?? ''} /> : null,
}));

const entries = vi.hoisted(() => ({ value: [] as unknown[] }));
vi.mock('@/utils/authFetch', () => ({
  getWithAuth: vi.fn(async () => ({ ok: true, json: async () => ({ data: entries.value }) })),
}));

import { LeaderboardTeaser } from '../LeaderboardTeaser';

const entry = (rank: number, name: string, extra: Record<string, unknown> = {}) => ({
  rank,
  name,
  key: `key${rank}abcdefgh`,
  avatarEmoji: null,
  avatarColor: null,
  avatarImage: null,
  customAvatar: null,
  total: 1000,
  byMode: { 'word-hunt': 500, 'word-wheel': 500, 'word-tower': 0, connections: 0 },
  towerHeightM: null,
  playedModes: ['word-hunt', 'word-wheel'],
  ...extra,
});

beforeEach(() => {
  entries.value = [
    entry(1, 'Zippy'),
    entry(7, 'Fish', { member: true, isYou: true, title: 'GRANDMASTER' }),
  ];
});

describe('LeaderboardTeaser player card', () => {
  it('opens the summary card from a signed-in player\'s avatar, your own row included, without expanding the row', async () => {
    render(<LeaderboardTeaser />);
    await screen.findByTestId('leaderboard-row-7');
    fireEvent.click(screen.getByRole('button', { name: 'playerSummary.openFor' }));
    const card = screen.getByTestId('summary');
    expect(card).toHaveAttribute('data-key', 'key7abcdefgh');
    expect(card).toHaveAttribute('data-date', '2026-11-14');
    expect(card).toHaveAttribute('data-title', 'GRANDMASTER');
    expect(screen.queryByTestId('leaderboard-breakdown-7')).toBeNull();
  });

  it('opens it from the name too', async () => {
    render(<LeaderboardTeaser />);
    fireEvent.click(await screen.findByText('Fish'));
    expect(screen.getByTestId('summary')).toBeInTheDocument();
  });

  it('still expands the per-game scores when the rest of the row is tapped', async () => {
    render(<LeaderboardTeaser />);
    fireEvent.click(await screen.findByTestId('leaderboard-row-1'));
    expect(screen.getByTestId('leaderboard-breakdown-1')).toBeInTheDocument();
    expect(screen.queryByTestId('summary')).toBeNull();
  });

  it('gives a guest row (no account) no card trigger', async () => {
    render(<LeaderboardTeaser />);
    await screen.findByText('Zippy');
    expect(screen.getAllByRole('button', { name: 'playerSummary.openFor' })).toHaveLength(1);
  });
});
