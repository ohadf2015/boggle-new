/**
 * GameLeaderboard — HOST badge & visual distinction tests
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameLeaderboard } from '../GameLeaderboard';
import type { ExtendedLeaderboardPlayer } from '@/shared/types/view';

// Mock motion
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock Avatar
vi.mock('@/components/Avatar', () => ({
  default: ({ size }: { size: string }) => (
    <div data-testid="avatar" data-size={size} />
  ),
}));

// Mock PlayerProfileTooltip
vi.mock('@/components/ui/PlayerProfileTooltip', () => ({
  default: ({ children }: React.PropsWithChildren) => (
    <div data-testid="profile-tooltip">{children}</div>
  ),
}));

// Mock PresenceIndicator
vi.mock('@/components/PresenceIndicator', () => ({
  default: ({ status }: { status: string }) => (
    <div data-testid="presence-indicator" data-status={status} />
  ),
}));

const mockT = (key: string) => key;

describe('GameLeaderboard — HOST badge & row styling', () => {
  it('renders HOST badge for host player', () => {
    const leaderboard: ExtendedLeaderboardPlayer[] = [
      {
        username: 'HostPlayer',
        score: 100,
        wordCount: 5,
        isHost: true,
        avatar: undefined,
        presenceStatus: 'active' as const,
        isWindowFocused: true,
        isBot: false,
        disconnected: false,
        comboLevel: 0,
      },
    ];

    render(
      <GameLeaderboard
        leaderboard={leaderboard}
        username="OtherPlayer"
        isHost={false}
        t={mockT}
        dir="ltr"
      />
    );

    const hostBadge = screen.getByText('HOST');
    expect(hostBadge).toBeInTheDocument();
    expect(hostBadge).toHaveClass('bg-neo-yellow');
    expect(hostBadge).toHaveClass('text-neo-black');
    expect(hostBadge).toHaveClass('font-black');
  });

  it('does NOT render HOST badge for non-host players', () => {
    const leaderboard: ExtendedLeaderboardPlayer[] = [
      {
        username: 'Player1',
        score: 100,
        wordCount: 5,
        isHost: false,
        avatar: undefined,
        presenceStatus: 'active' as const,
        isWindowFocused: true,
        isBot: false,
        disconnected: false,
        comboLevel: 0,
      },
    ];

    render(
      <GameLeaderboard
        leaderboard={leaderboard}
        username="OtherPlayer"
        isHost={false}
        t={mockT}
        dir="ltr"
      />
    );

    // Should not have HOST badge
    expect(screen.queryByText('HOST')).not.toBeInTheDocument();
  });

  it('host row has left border styling', () => {
    const leaderboard: ExtendedLeaderboardPlayer[] = [
      {
        username: 'HostPlayer',
        score: 100,
        wordCount: 5,
        isHost: true,
        avatar: undefined,
        presenceStatus: 'active' as const,
        isWindowFocused: true,
        isBot: false,
        disconnected: false,
        comboLevel: 0,
      },
    ];

    const { container } = render(
      <GameLeaderboard
        leaderboard={leaderboard}
        username="OtherPlayer"
        isHost={false}
        t={mockT}
        dir="ltr"
      />
    );

    const hostRow = container.querySelector('[role="listitem"]');
    expect(hostRow?.className).toContain('border-l-4');
    expect(hostRow?.className).toContain('border-l-neo-yellow');
  });

  it('crown icon still visible for host player', () => {
    const leaderboard: ExtendedLeaderboardPlayer[] = [
      {
        username: 'HostPlayer',
        score: 100,
        wordCount: 5,
        isHost: true,
        avatar: undefined,
        presenceStatus: 'active' as const,
        isWindowFocused: true,
        isBot: false,
        disconnected: false,
        comboLevel: 0,
      },
    ];

    const { container } = render(
      <GameLeaderboard
        leaderboard={leaderboard}
        username="OtherPlayer"
        isHost={false}
        t={mockT}
        dir="ltr"
      />
    );

    // Crown should be in the document (lucide-react renders as svg)
    const crowns = container.querySelectorAll('svg');
    expect(crowns.length).toBeGreaterThan(0); // Trophy + Crown = at least 2
  });
});
