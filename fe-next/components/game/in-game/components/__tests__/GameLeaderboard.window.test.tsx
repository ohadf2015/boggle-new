/**
 * GameLeaderboard — 3-player window around the current player
 *
 * Instead of rendering the full roster (which on mobile pushes the player's own
 * row off-screen and buries their position), the in-game leaderboard is capped
 * to three rows centred on the current player: the rival directly above, the
 * player themselves, and the rival directly below. Real ranks are preserved and
 * a small "+N" chevron indicator shows how many players are hidden above/below.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameLeaderboard, windowAroundUser } from '../GameLeaderboard';
import type { ExtendedLeaderboardPlayer } from '@/shared/types/view';

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
      <div className={className}>{children}</div>
    ),
  },
}));

vi.mock('@/components/Avatar', () => ({
  default: ({ size }: { size: string }) => <div data-testid="avatar" data-size={size} />,
}));

vi.mock('@/components/ui/PlayerProfileTooltip', () => ({
  default: ({ children }: React.PropsWithChildren) => <div data-testid="profile-tooltip">{children}</div>,
}));

vi.mock('@/components/PresenceIndicator', () => ({
  default: ({ status }: { status: string }) => <div data-testid="presence-indicator" data-status={status} />,
}));

vi.mock('@/hooks/useReactiveAvatarMood', () => ({ useReactiveAvatarMood: () => 'neutral' }));
vi.mock('@/hooks/gameState/selectors', () => ({ useLiveScoreFor: () => undefined }));

const mockT = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

function player(over: Partial<ExtendedLeaderboardPlayer> & { username: string; score: number }): ExtendedLeaderboardPlayer {
  return {
    wordCount: 0,
    isHost: false,
    avatar: undefined,
    presenceStatus: 'active' as const,
    isWindowFocused: true,
    isBot: false,
    disconnected: false,
    comboLevel: 0,
    ...over,
  } as ExtendedLeaderboardPlayer;
}

// 6 players, pre-sorted by score (rank === index)
function roster() {
  return [
    player({ username: 'P1', score: 120 }),
    player({ username: 'P2', score: 100 }),
    player({ username: 'P3', score: 80 }),
    player({ username: 'P4', score: 60 }),
    player({ username: 'P5', score: 40 }),
    player({ username: 'P6', score: 20 }),
  ];
}

describe('windowAroundUser', () => {
  it('returns all players unchanged when the roster fits within the window', () => {
    const players = ['a', 'b', 'c'];
    const w = windowAroundUser(players, 1, 3);
    expect(w.slice).toEqual(['a', 'b', 'c']);
    expect(w.hiddenAbove).toBe(0);
    expect(w.hiddenBelow).toBe(0);
  });

  it('centres the window on the current player', () => {
    const players = ['a', 'b', 'c', 'd', 'e', 'f'];
    const w = windowAroundUser(players, 3, 3); // me = 'd'
    expect(w.slice).toEqual(['c', 'd', 'e']);
    expect(w.hiddenAbove).toBe(2); // a, b
    expect(w.hiddenBelow).toBe(1); // f
  });

  it('clamps to the top when the player leads', () => {
    const players = ['a', 'b', 'c', 'd', 'e', 'f'];
    const w = windowAroundUser(players, 0, 3); // me = 'a'
    expect(w.slice).toEqual(['a', 'b', 'c']);
    expect(w.hiddenAbove).toBe(0);
    expect(w.hiddenBelow).toBe(3);
  });

  it('clamps to the bottom when the player is last', () => {
    const players = ['a', 'b', 'c', 'd', 'e', 'f'];
    const w = windowAroundUser(players, 5, 3); // me = 'f'
    expect(w.slice).toEqual(['d', 'e', 'f']);
    expect(w.hiddenAbove).toBe(3);
    expect(w.hiddenBelow).toBe(0);
  });

  it('falls back to the top of the roster when there is no current player', () => {
    const players = ['a', 'b', 'c', 'd', 'e', 'f'];
    const w = windowAroundUser(players, -1, 3);
    expect(w.slice).toEqual(['a', 'b', 'c']);
    expect(w.hiddenAbove).toBe(0);
    expect(w.hiddenBelow).toBe(3);
  });
});

describe('GameLeaderboard — windowed rows', () => {
  // CHANGED 2026-08-26: rooms above 4 players now get a wider window (4 rows here)
  // plus a pinned rank-1 row. Previously this asserted exactly 3 rows and that P1
  // was NOT rendered — that was the old small-room-only behaviour, and it made the
  // leader invisible in every crowded room. See GameLeaderboard.bigRoom.test.tsx.
  it('renders a widened window centred on the current player, with the leader pinned', () => {
    render(<GameLeaderboard leaderboard={roster()} username="P4" isHost={false} t={mockT} dir="ltr" />);

    // Neighbours of P4 are shown…
    expect(screen.getByText('P3')).toBeInTheDocument();
    expect(screen.getByText('P4')).toBeInTheDocument();
    expect(screen.getByText('P5')).toBeInTheDocument();
    // …the leader is pinned so "who is winning" is answerable…
    expect(screen.getByText('P1')).toBeInTheDocument();
    // …and is never duplicated.
    expect(screen.getAllByText('P1')).toHaveLength(1);
    // P2 remains summarised by the "+N above" cue.
    expect(screen.queryByText('P2')).not.toBeInTheDocument();
  });

  it('preserves the real rank number of the windowed player', () => {
    render(<GameLeaderboard leaderboard={roster()} username="P4" isHost={false} t={mockT} dir="ltr" />);
    // P4 is 4th overall → its badge reads "#4", not "#2" (its index within the window)
    const p4Row = screen.getByText('P4').closest('[role="listitem"]')!;
    expect(within(p4Row as HTMLElement).getByText('#4')).toBeInTheDocument();
  });

  // CHANGED 2026-08-26: with a 4-row window at 6 players the window reaches the
  // bottom of the roster, and the pinned leader is no longer counted as hidden.
  it('excludes the pinned leader from the hidden-count cue', () => {
    render(<GameLeaderboard leaderboard={roster()} username="P4" isHost={false} t={mockT} dir="ltr" />);

    // P1 is pinned (on screen) and P3..P6 are in the window, so only P2 is hidden.
    expect(screen.getByTestId('leaderboard-more-above')).toHaveTextContent('1');
    // The window now reaches P6, so nothing is hidden below.
    expect(screen.queryByTestId('leaderboard-more-below')).not.toBeInTheDocument();
  });

  it('does not render hidden-count indicators when nothing is hidden', () => {
    const small = [player({ username: 'A', score: 10 }), player({ username: 'B', score: 5 })];
    render(<GameLeaderboard leaderboard={small} username="A" isHost={false} t={mockT} dir="ltr" />);

    expect(screen.queryByTestId('leaderboard-more-above')).not.toBeInTheDocument();
    expect(screen.queryByTestId('leaderboard-more-below')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
