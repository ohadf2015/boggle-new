/**
 * GameLeaderboard — "your standing" status strip
 *
 * The MP view now keeps a single live leaderboard (the ranked standings).
 * To preserve the motivational "live race" cue that the old CompactLeaderboard
 * provided, GameLeaderboard surfaces a compact strip telling the current
 * player whether they are leading (and by how much) or how many points they
 * need to catch the player directly above them.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameLeaderboard } from '../GameLeaderboard';
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

describe('GameLeaderboard — your standing strip', () => {
  it('shows the "leading" cue with the gap to second place when the player is #1', () => {
    const leaderboard = [player({ username: 'Me', score: 50 }), player({ username: 'Rival', score: 30 })];

    render(<GameLeaderboard leaderboard={leaderboard} username="Me" isHost={false} t={mockT} dir="ltr" />);

    const strip = screen.getByTestId('leaderboard-you-status');
    expect(strip).toHaveTextContent('leaderboard.leading');
    // +20 ahead of second place
    expect(strip).toHaveTextContent('+20');
    expect(strip).toHaveTextContent('leaderboard.ahead');
  });

  it('shows the points needed to catch the player directly above when not leading', () => {
    const leaderboard = [player({ username: 'Leader', score: 40 }), player({ username: 'Me', score: 25 })];

    render(<GameLeaderboard leaderboard={leaderboard} username="Me" isHost={false} t={mockT} dir="ltr" />);

    const strip = screen.getByTestId('leaderboard-you-status');
    // need 40 - 25 + 1 = 16 points to pass
    expect(strip).toHaveTextContent('+16');
    expect(strip).toHaveTextContent('leaderboard.toCatch');
  });

  it('does NOT render the status strip in a solo leaderboard', () => {
    const leaderboard = [player({ username: 'Me', score: 10 })];

    render(<GameLeaderboard leaderboard={leaderboard} username="Me" isHost={false} t={mockT} dir="ltr" />);

    expect(screen.queryByTestId('leaderboard-you-status')).not.toBeInTheDocument();
  });

  it('does NOT render the status strip when the current player is not on the board', () => {
    const leaderboard = [player({ username: 'A', score: 10 }), player({ username: 'B', score: 5 })];

    render(<GameLeaderboard leaderboard={leaderboard} username="Spectator" isHost={false} t={mockT} dir="ltr" />);

    expect(screen.queryByTestId('leaderboard-you-status')).not.toBeInTheDocument();
  });

  it('localizes the player count in the header instead of hardcoding English', () => {
    const leaderboard = [player({ username: 'A', score: 10 }), player({ username: 'B', score: 5 })];

    render(<GameLeaderboard leaderboard={leaderboard} username="A" isHost={false} t={mockT} dir="ltr" />);

    // Uses the shared, already-translated players-count key (with interpolation)
    expect(screen.getByText(/mp\.rivals\.playersCount/)).toBeInTheDocument();
    expect(screen.queryByText(/\bplayers\b/)).not.toBeInTheDocument();
  });
});
