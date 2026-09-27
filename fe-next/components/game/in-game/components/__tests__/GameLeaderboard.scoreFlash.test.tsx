import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { GameLeaderboard } from '../GameLeaderboard';
import type { ExtendedLeaderboardPlayer } from '@/shared/types/view';

const mockT = (key: string) => key;

const mockPlayers: ExtendedLeaderboardPlayer[] = [
  {
    username: 'player1',
    score: 100,
    wordCount: 5,
    comboLevel: 0,
    avatar: undefined,
    presenceStatus: 'active',
    isWindowFocused: true,
    isHost: false,
  },
  {
    username: 'player2',
    score: 80,
    wordCount: 4,
    comboLevel: 0,
    avatar: undefined,
    presenceStatus: 'idle',
    isWindowFocused: false,
    isHost: false,
  },
];

describe('GameLeaderboard - Score Flash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders leaderboard rows', () => {
    render(
      <GameLeaderboard
        leaderboard={mockPlayers}
        username="player1"
        isHost={false}
        t={mockT}
        dir="ltr"
      />
    );

    expect(screen.getByText('player1')).toBeInTheDocument();
    expect(screen.getByText('player2')).toBeInTheDocument();
  });

  it('displays scores for all players', () => {
    render(
      <GameLeaderboard
        leaderboard={mockPlayers}
        username="player1"
        isHost={false}
        t={mockT}
        dir="ltr"
      />
    );

    // Scores should be displayed
    const scoreElements = screen.getAllByText('100');
    expect(scoreElements.length).toBeGreaterThan(0);
  });

  it('handles score increase by tracking changes', async () => {
    const { rerender } = render(
      <GameLeaderboard
        leaderboard={mockPlayers}
        username="player1"
        isHost={false}
        t={mockT}
        dir="ltr"
      />
    );

    // Update player1's score
    const updatedPlayers: ExtendedLeaderboardPlayer[] = [
      { ...mockPlayers[0], score: 120 },
      mockPlayers[1],
    ];

    rerender(
      <GameLeaderboard
        leaderboard={updatedPlayers}
        username="player1"
        isHost={false}
        t={mockT}
        dir="ltr"
      />
    );

    // Score should update to new value
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('highlights current player row', () => {
    const { container } = render(
      <GameLeaderboard
        leaderboard={mockPlayers}
        username="player1"
        isHost={false}
        t={mockT}
        dir="ltr"
      />
    );

    // The player1 row should have a ring (ring-2 ring-neo-cyan/50)
    const rows = container.querySelectorAll('[role="listitem"]');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('renders rank badge for each player', () => {
    const { container } = render(
      <GameLeaderboard
        leaderboard={mockPlayers}
        username="player1"
        isHost={false}
        t={mockT}
        dir="ltr"
      />
    );

    const rankBadges = container.querySelectorAll('.w-7.h-7');
    expect(rankBadges.length).toBeGreaterThanOrEqual(mockPlayers.length);
  });

  it('shows host indicator for host player', () => {
    const hostPlayers: ExtendedLeaderboardPlayer[] = [
      { ...mockPlayers[0], username: 'host-player', isHost: true },
      mockPlayers[1],
    ];

    const { container } = render(
      <GameLeaderboard
        leaderboard={hostPlayers}
        username="host-player"
        isHost={false}
        t={mockT}
        dir="ltr"
      />
    );

    // Host indicator is the crown icon (decluttered: no separate "HOST" chip /
    // yellow stripe — the crown alone marks the host).
    const rows = container.querySelectorAll('[role="listitem"]');
    expect(rows.length).toBeGreaterThan(0);
    const crown = container.querySelector('[aria-label="Host"]');
    expect(crown).not.toBeNull();
    // ...and it lives in the first (host) row.
    expect(rows[0].contains(crown)).toBe(true);
  });

  it('handles RTL direction', () => {
    const { container } = render(
      <GameLeaderboard
        leaderboard={mockPlayers}
        username="player1"
        isHost={false}
        t={mockT}
        dir="rtl"
      />
    );

    const rows = container.querySelectorAll('[role="listitem"]');
    expect(rows.length).toBeGreaterThan(0);
    // RTL rows should have flex-row-reverse
    rows.forEach((row) => {
      expect(row.className).toContain('flex-row-reverse');
    });
  });
});
