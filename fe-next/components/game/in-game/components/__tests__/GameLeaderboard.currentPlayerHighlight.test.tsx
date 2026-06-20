/**
 * GameLeaderboard — current-player row clarity
 *
 * Players reported the live scoring board made it hard to spot their own row
 * at a glance (the old treatment was a faint cyan ring among similarly-styled
 * rank rows). The current player's row must be unmistakable: a distinct solid
 * highlight + a stable hook (`data-current-player`) so it stands out from the
 * gold/silver/bronze rank colours of the rivals.
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

describe('GameLeaderboard — current-player row clarity', () => {
  it('flags exactly one row as the current player via data-current-player', () => {
    const leaderboard = [
      player({ username: 'Leader', score: 50 }),
      player({ username: 'Me', score: 45 }),
      player({ username: 'Rival', score: 40 }),
    ];

    render(<GameLeaderboard leaderboard={leaderboard} username="Me" isHost={false} t={mockT} dir="ltr" />);

    const rows = screen.getAllByRole('listitem');
    const mine = rows.filter((r) => r.getAttribute('data-current-player') === 'true');
    expect(mine).toHaveLength(1);
    expect(mine[0]).toHaveTextContent('Me');
  });

  it('gives the current-player row a distinct solid highlight (not just a faint ring)', () => {
    const leaderboard = [
      player({ username: 'Leader', score: 50 }),
      player({ username: 'Me', score: 45 }),
    ];

    render(<GameLeaderboard leaderboard={leaderboard} username="Me" isHost={false} t={mockT} dir="ltr" />);

    const mine = screen
      .getAllByRole('listitem')
      .find((r) => r.getAttribute('data-current-player') === 'true');
    expect(mine).toBeDefined();
    // Solid cyan fill makes the row pop against the gold/silver/cream rank rows.
    expect(mine!.className).toContain('bg-neo-cyan');
    // Stronger separation than the old ring-2/60.
    expect(mine!.className).toContain('ring-neo-cyan');
  });

  it('does not flag any rival row as the current player', () => {
    const leaderboard = [
      player({ username: 'Leader', score: 50 }),
      player({ username: 'Me', score: 45 }),
    ];

    render(<GameLeaderboard leaderboard={leaderboard} username="Me" isHost={false} t={mockT} dir="ltr" />);

    const rivalRow = screen
      .getAllByRole('listitem')
      .find((r) => r.textContent?.includes('Leader'));
    expect(rivalRow?.getAttribute('data-current-player')).toBe('false');
    expect(rivalRow?.className).not.toContain('bg-neo-cyan');
  });
});
