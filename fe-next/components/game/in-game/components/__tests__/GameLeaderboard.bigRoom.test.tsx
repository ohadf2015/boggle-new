/**
 * GameLeaderboard — big-room legibility (5+ players)
 *
 * Ground truth (Supabase `game_sessions`, 2026-08-26): rooms really do reach 14–15
 * players and they RETAIN well — room QV57D3 ran 13→14→15→15→15→14 across six rounds.
 * The engine holds (MAX_PLAYERS_PER_ROOM = 50, leaderboard broadcasts throttled to
 * ~2/s with signature dedup). What collapses is the presentation: a fixed
 * LEADERBOARD_WINDOW of 3 renders a 14-player party as a 3-player race, and because
 * the window is centred on YOU, the person actually winning is invisible unless you
 * happen to be next to them.
 *
 * Two behaviours make a crowded room readable without burying the player's own row:
 *   1. The window grows with the roster (3 → 4 → 5).
 *   2. Rank 1 is PINNED whenever it would otherwise be hidden above the window, so
 *      "who is winning and how far ahead" is always answerable.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  GameLeaderboard,
  windowAroundUser,
  leaderboardWindowSize,
} from '../GameLeaderboard';
import type { ExtendedLeaderboardPlayer } from '@/shared/types/view';

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Expose userId so we can assert the avatar is identifiable rather than a skeleton.
vi.mock('@/components/Avatar', () => ({
  default: ({ size, userId }: { size: string; userId?: string }) => (
    <div data-testid="avatar" data-size={size} data-user-id={userId ?? ''} />
  ),
}));

vi.mock('@/components/ui/PlayerProfileTooltip', () => ({
  default: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

vi.mock('@/components/PresenceIndicator', () => ({
  default: ({ status }: { status: string }) => <div data-status={status} />,
}));

vi.mock('@/hooks/useReactiveAvatarMood', () => ({ useReactiveAvatarMood: () => 'neutral' }));
vi.mock('@/hooks/gameState/selectors', () => ({ useLiveScoreFor: () => undefined }));

const mockT = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

function player(
  over: Partial<ExtendedLeaderboardPlayer> & { username: string; score: number },
): ExtendedLeaderboardPlayer {
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

/** N players, pre-sorted by score so rank === index + 1. */
function roster(n: number) {
  return Array.from({ length: n }, (_, i) =>
    player({ username: `P${i + 1}`, score: (n - i) * 10 }),
  );
}

describe('leaderboardWindowSize', () => {
  it('keeps the tight 3-row window for small rooms (unchanged behaviour)', () => {
    expect(leaderboardWindowSize(2)).toBe(3);
    expect(leaderboardWindowSize(3)).toBe(3);
    expect(leaderboardWindowSize(4)).toBe(3);
  });

  it('opens up one row for mid-size rooms', () => {
    expect(leaderboardWindowSize(5)).toBe(4);
    expect(leaderboardWindowSize(8)).toBe(4);
  });

  it('opens up further for big rooms', () => {
    expect(leaderboardWindowSize(9)).toBe(5);
    expect(leaderboardWindowSize(14)).toBe(5);
    expect(leaderboardWindowSize(50)).toBe(5);
  });
});

describe('windowAroundUser — leader pinning', () => {
  it('pins rank 1 when the leader is hidden above the window', () => {
    const players = roster(14).map((p) => p.username);
    // me = P10 (index 9) — mid-pack, leader far above
    const w = windowAroundUser(players, 9, 5, true);

    expect(w.pinnedLeader).toBe('P1');
    expect(w.slice).not.toContain('P1'); // never duplicated into the window
    expect(w.slice).toContain('P10');
    // The pinned leader is accounted for, so the "+N above" cue does not
    // double-count a player who is already on screen.
    expect(w.hiddenAbove).toBe(6); // P2..P7 hidden; P1 is pinned, P8/P9 in window
  });

  it('does not pin when the player IS the leader', () => {
    const players = roster(14).map((p) => p.username);
    const w = windowAroundUser(players, 0, 5, true);
    expect(w.pinnedLeader).toBeNull();
    expect(w.slice[0]).toBe('P1');
  });

  it('does not pin when the leader is already inside the window', () => {
    const players = roster(14).map((p) => p.username);
    const w = windowAroundUser(players, 2, 5, true); // window clamps to top
    expect(w.pinnedLeader).toBeNull();
    expect(w.slice).toContain('P1');
  });

  it('leaves existing callers untouched when pinning is off', () => {
    const players = ['a', 'b', 'c', 'd', 'e', 'f'];
    const w = windowAroundUser(players, 3, 3);
    expect(w.slice).toEqual(['c', 'd', 'e']);
    expect(w.hiddenAbove).toBe(2);
    expect(w.pinnedLeader).toBeNull();
  });
});

describe('GameLeaderboard — 14-player room', () => {
  it('shows the leader even when the player is mid-pack', () => {
    render(
      <GameLeaderboard leaderboard={roster(14)} username="P10" isHost={false} t={mockT} dir="ltr" />,
    );
    // The person actually winning is on screen…
    expect(screen.getByText('P1')).toBeInTheDocument();
    // …and so is the player themselves.
    expect(screen.getByText('P10')).toBeInTheDocument();
  });

  it('renders the leader exactly once (no duplicate row)', () => {
    render(
      <GameLeaderboard leaderboard={roster(14)} username="P10" isHost={false} t={mockT} dir="ltr" />,
    );
    expect(screen.getAllByText('P1')).toHaveLength(1);
  });

  it('shows more of the room than the small-room window', () => {
    render(
      <GameLeaderboard leaderboard={roster(14)} username="P10" isHost={false} t={mockT} dir="ltr" />,
    );
    // 5-row window + 1 pinned leader
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(3);
  });

  it('shows a 4-player room in full — the tight window plus the pinned leader covers everyone', () => {
    render(
      <GameLeaderboard leaderboard={roster(4)} username="P3" isHost={false} t={mockT} dir="ltr" />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    // Nothing is summarised away, so neither "+N" cue appears.
    expect(screen.queryByTestId('leaderboard-more-above')).not.toBeInTheDocument();
    expect(screen.queryByTestId('leaderboard-more-below')).not.toBeInTheDocument();
  });

  it('gives every avatar a userId so it renders a real face, not a skeleton', () => {
    render(
      <GameLeaderboard leaderboard={roster(14)} username="P10" isHost={false} t={mockT} dir="ltr" />,
    );
    const avatars = screen.getAllByTestId('avatar');
    expect(avatars.length).toBeGreaterThan(0);
    for (const a of avatars) {
      expect(a.getAttribute('data-user-id')).toBeTruthy();
    }
  });
});
