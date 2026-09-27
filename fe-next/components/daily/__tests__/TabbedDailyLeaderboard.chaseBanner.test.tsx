/**
 * Wiring test: the chase banner must actually render inside the leaderboard the
 * game screens use.
 *
 * This audit found three components (StreakBar, StreakCounter, useRankUpDetection)
 * that were fully implemented, fully unit-tested and mounted nowhere. A passing
 * component test proves the component works; only a wiring test proves a player
 * will ever see it. Word Hunt and Word Wheel render TabbedDailyLeaderboard — NOT
 * DailyLeaderboard — so this is the mount that matters.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/hooks/useFriends', () => ({
  useFriends: () => ({ friends: [] }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => true,
}));

import TabbedDailyLeaderboard from '../TabbedDailyLeaderboard';

// Mirrors LanguageContext's `t`: it interpolates `{param}` itself, which is why
// ChaseBanner has no interpolation helper of its own.
const t = (key: string, params?: Record<string, string | number>) => {
  const dict: Record<string, string> = {
    'daily.chaseChasing': '{points} behind {name}',
    'daily.chaseChasingCta': 'One good word passes them',
    'daily.chaseRank': '#{rank} of {total}',
  };
  return (dict[key] ?? key).replace(/\{(\w+)\}/g, (m, k) =>
    params?.[k] !== undefined ? String(params[k]) : m
  );
};

const board = [
  {
    player_id: 'maya',
    guest_fingerprint: null,
    display_name: 'Maya',
    avatar_emoji: '🎯',
    avatar_color: '#fff',
    score: 340,
    word_count: 20,
    time_seconds: 60,
    completed_at: '2026-08-01T10:00:00Z',
    rank_position: 1,
  },
  {
    player_id: 'me',
    guest_fingerprint: null,
    display_name: 'Me',
    avatar_emoji: '🎲',
    avatar_color: '#fff',
    score: 298,
    word_count: 18,
    time_seconds: 70,
    completed_at: '2026-08-01T10:05:00Z',
    rank_position: 2,
  },
];

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: board, totalPlayers: 6, totalSolved: 2, guestPlayerCount: 0 }),
  }) as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TabbedDailyLeaderboard — chase banner wiring', () => {
  it('renders the chase banner for the player on the today tab', async () => {
    render(
      <TabbedDailyLeaderboard
        puzzleDate="2026-08-01"
        language="en"
        currentPlayerId="me"
        t={t}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('chase-banner')).toBeInTheDocument();
    });
    // Names the player directly above. The point figure is not asserted here:
    // the default 'combined' scope merges the Word Hunt and Word Wheel boards
    // into one row per player, so the totals are a sum this test would only be
    // restating. computeChaseTarget's own tests pin the arithmetic.
    expect(screen.getByTestId('chase-banner')).toHaveTextContent('Maya');
  });

  it('uses the fetched board total, not the number of rows returned', async () => {
    render(
      <TabbedDailyLeaderboard
        puzzleDate="2026-08-01"
        language="en"
        currentPlayerId="me"
        t={t}
      />,
    );

    // 2 rows in hand, but 6 people played today.
    await waitFor(() => {
      expect(screen.getByText('#2 of 6')).toBeInTheDocument();
    });
  });

  it('shows nothing for a viewer who is not on the board', async () => {
    render(
      <TabbedDailyLeaderboard
        puzzleDate="2026-08-01"
        language="en"
        currentPlayerId="a-stranger"
        t={t}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Maya')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('chase-banner')).not.toBeInTheDocument();
  });
});
